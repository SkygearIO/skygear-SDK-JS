/* eslint-disable */

function stringifyFunctionCall() {
  var args = Array.prototype.slice.call(arguments);
  var funcExpr = args[0];
  var funcArgs = args.slice(1);
  var parts = [funcExpr, "("];
  for (var i = 0; i < funcArgs.length; ++i) {
    var v = funcArgs[i];
    if (v === undefined) {
      continue;
    }
    if (i > 0) {
      parts.push(", ");
    }
    if (v instanceof Blob) {
      parts.push("<Blob>");
    } else {
      parts.push(JSON.stringify(v));
    }
  }
  parts.push(")");
  return parts.join("");
}
