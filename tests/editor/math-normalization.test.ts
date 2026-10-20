import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { Schema } from "@tiptap/pm/model"
import { EditorState, TextSelection } from "@tiptap/pm/state"
import {
  buildMathNormalizationTransaction,
  mathClipboardSlice,
} from "../../components/tools/mock-tests/editor/math-normalization"

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    codeBlock: { group: "block", content: "text*", code: true },
    text: { group: "inline" },
    mathInline: {
      group: "inline",
      inline: true,
      atom: true,
      attrs: { tex: {} },
    },
    mathBlock: { group: "block", atom: true, attrs: { tex: {} } },
  },
  marks: { strong: {}, code: { code: true } },
})
const paragraph = (text: string) =>
  schema.nodes.paragraph.create(null, schema.text(text))
const stateFor = (text: string) =>
  EditorState.create({
    schema,
    doc: schema.nodes.doc.create(null, paragraph(text)),
  })

describe("editor math normalization", () => {
  it("converts multiple formulas and numeric paired delimiters in loaded prose", () => {
    const tr = buildMathNormalizationTransaction(
      stateFor("Find $x^2$ then $100$.")
    )!
    assert.ok(tr)
    assert.equal(tr.doc.firstChild?.child(1).attrs.tex, "x^2")
    assert.equal(tr.doc.firstChild?.child(3).attrs.tex, "100")
    tr.doc.check()
    assert.equal(
      buildMathNormalizationTransaction(
        EditorState.create({ schema, doc: tr.doc })
      ),
      null
    )
  })
  it("retains marks around and on math across text runs", () => {
    const bold = schema.marks.strong.create()
    const doc = schema.nodes.doc.create(
      null,
      schema.nodes.paragraph.create(null, [
        schema.text("Before $", [bold]),
        schema.text("x^2"),
        schema.text("$ after", [bold]),
      ])
    )
    const tr = buildMathNormalizationTransaction(
      EditorState.create({ schema, doc })
    )!
    assert.equal(tr.doc.firstChild?.child(0).marks[0].type.name, "strong")
    assert.equal(tr.doc.firstChild?.child(1).marks[0].type.name, "strong")
    assert.equal(tr.doc.firstChild?.child(2).marks[0].type.name, "strong")
  })
  it("skips code blocks, code marks, escaped dollars and unclosed currency", () => {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.codeBlock.create(null, schema.text("$x^2$")),
      schema.nodes.paragraph.create(
        null,
        schema.text("$x^2$", [schema.marks.code.create()])
      ),
      paragraph(String.raw`Price \$5 and $10; literal \$x$`),
    ])
    assert.ok(
      buildMathNormalizationTransaction(EditorState.create({ schema, doc })) ===
        null
    )
  })
  it("leaves normal typing and its selection untouched", () => {
    const state = stateFor("plain prose")
    const tr = state.tr.insertText("!", 5)
    const next = state.apply(tr)
    assert.equal(buildMathNormalizationTransaction(next), null)
    assert.equal(next.selection.from, tr.selection.from)
  })
  it("maps a cursor past converted inline math without resetting it to start", () => {
    const state = stateFor("Use $x$ next")
    const selected = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, 12))
    )
    const tr = buildMathNormalizationTransaction(selected)!
    assert.equal(tr.selection.from, tr.mapping.map(12))
  })
  it("splits mixed prose/display math into valid blocks and retains following prose", () => {
    const tr = buildMathNormalizationTransaction(
      stateFor("Before $$x^2$$ after")
    )!
    tr.doc.check()
    assert.equal(tr.doc.child(0).textContent, "Before ")
    assert.equal(tr.doc.child(1).type.name, "mathBlock")
    assert.equal(tr.doc.child(2).textContent, " after")
  })
  it("keeps a typing paragraph after standalone display math", () => {
    const tr = buildMathNormalizationTransaction(stateFor("$$100$$"))!
    assert.equal(tr.doc.child(0).type.name, "mathBlock")
    assert.equal(tr.doc.child(1).type.name, "paragraph")
    tr.doc.check()
  })
  it("pastes mixed prose, inline math and multiline display as valid editable atoms", () => {
    const slice = mathClipboardSlice(
      "Start $100$.\n$$\nx^2 + 1\n$$\nFinish.",
      schema
    )!
    const state = stateFor("existing ")
    const tr = state.tr
      .setSelection(TextSelection.create(state.doc, 10))
      .replaceSelection(slice)
    tr.doc.check()
    const math: string[] = []
    tr.doc.descendants((node) => {
      if (node.type.name.startsWith("math")) math.push(node.attrs.tex)
    })
    assert.deepEqual(math, ["100", "x^2 + 1"])
    assert.ok(tr.doc.textContent.includes("existing Start "))
    assert.ok(tr.doc.textContent.includes("Finish."))
  })
})
