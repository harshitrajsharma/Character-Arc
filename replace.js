const fs = require('fs');

function processFile(filePath, isGoalsPaths) {
  let content = fs.readFileSync(filePath, 'utf8');

  if (isGoalsPaths) {
    content = content.replace(/import \{ getVerifiedClaims \} from \"@\/lib\/auth\/session\"\r?\n/, '');
  } else {
    content = content.replace(/import \{ requireVerifiedClaims \} from \"@\/lib\/auth\/session\"\r?\n/, '');
  }

  content = content.replace(/import type \{ ToolActionResult \} from \"(.*?)\"/, 'import type { ToolActionResult, ToolExecutionPrincipal } from "$1"');

  content = content.replace(/input: ExecuteToolActionInput,\r?\n\s+handlerVersion: string/g, 'input: ExecuteToolActionInput,\n  principal: ToolExecutionPrincipal,\n  handlerVersion: string');

  if (isGoalsPaths) {
    content = content.replace(/\s+const claims = await getVerifiedClaims\(\)\r?\n\s+if \(\!claims\?\.sub\) \{\r?\n\s+throw new ToolActionExecutionError\(\"Authentication is required to execute tools\.\", \"FORBIDDEN\"\)\r?\n\s+\}\r?\n\s+const actorId = claims\.sub/g, '\n  const actorId = principal.actorId');
  } else {
    content = content.replace(/\s+const claims = await requireVerifiedClaims\(\"\/tools\"\)\r?\n\s+const actorId = claims\.sub/g, '\n  const actorId = principal.actorId');
  }

  content = content.replace(/invocationSource: \"web\"/g, 'invocationSource: principal.invocationSource');

  fs.writeFileSync(filePath, content, 'utf8');
}

processFile('lib/tools/exam-prep-handlers.ts', false);
processFile('lib/tools/goals-paths-handlers.ts', true);
