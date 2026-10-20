import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  canonicalQuestionContent,
  equivalentQuestionRevision,
} from "../../lib/tools/mock-tests/question-revision"

const original = {
  kind: "SINGLE_CHOICE",
  stem: "Choose $A$.",
  options: [
    { key: "A", content: "$100$", position: 0 },
    { key: "B", content: "20", position: 1 },
  ],
  answerKeys: ["A"],
  explanation: "Use $A$.",
}

describe("historical question revision guard", () => {
  it("allows identical choices and answer keys", () => {
    assert.equal(equivalentQuestionRevision(original, { ...original }), true)
  })
  it("accepts raw math versus editor atoms and plain paragraph serialization", () => {
    const edited = {
      ...original,
      stem: '<p>Choose <span data-tex="A" data-math-inline="true" class="math-inline"></span>.</p>',
      options: [
        {
          key: "A",
          content:
            '<p><span data-math-inline="true" data-tex="100" class="math-inline"></span></p>',
          position: 0,
        },
        { key: "B", content: "<p>20</p>", position: 1 },
      ],
    }
    assert.equal(equivalentQuestionRevision(original, edited), true)
  })
  it("decodes math attribute entities and recognizes display atoms", () => {
    assert.equal(
      canonicalQuestionContent(
        '<div data-math-block="true" data-tex="x &lt; 10"></div>'
      ),
      "$$x < 10$$"
    )
  })
  it("rejects changed answer keys even when content matches", () => {
    assert.equal(
      equivalentQuestionRevision(original, { ...original, answerKeys: ["B"] }),
      false
    )
  })
  it("rejects changed choices, removals, reorder, question kind or explanation", () => {
    assert.equal(
      equivalentQuestionRevision(original, {
        ...original,
        options: [
          { ...original.options[0], content: "200" },
          original.options[1],
        ],
      }),
      false
    )
    assert.equal(
      equivalentQuestionRevision(original, {
        ...original,
        options: original.options.slice(0, 1),
      }),
      false
    )
    assert.equal(
      equivalentQuestionRevision(original, {
        ...original,
        options: original.options.map((option) => ({
          ...option,
          position: 1 - option.position,
        })),
      }),
      false
    )
    assert.equal(
      equivalentQuestionRevision(original, {
        ...original,
        kind: "MULTIPLE_CHOICE",
      }),
      false
    )
    assert.equal(
      equivalentQuestionRevision(original, {
        ...original,
        explanation: "Different reasoning",
      }),
      false
    )
  })
  it("does not strip images, links or arbitrary formatting", () => {
    assert.notEqual(
      canonicalQuestionContent('<p><img src="first.png"></p>'),
      canonicalQuestionContent('<p><img src="second.png"></p>')
    )
    assert.notEqual(
      canonicalQuestionContent('<a href="one">A</a>'),
      canonicalQuestionContent('<a href="two">A</a>')
    )
    assert.notEqual(
      canonicalQuestionContent("<strong>A</strong>"),
      canonicalQuestionContent("A")
    )
    assert.notEqual(
      canonicalQuestionContent(
        '<span data-tex="A" data-math-inline="true" style="color:red"></span>'
      ),
      canonicalQuestionContent("$A$")
    )
  })
})
