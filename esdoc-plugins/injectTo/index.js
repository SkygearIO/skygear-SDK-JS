/**
 * Usage:
 * 1. @injectTo {TargetClass}
 * 2. @injectTo {TargetClass} as TargetMethodName
 */
class InjectToPlugin {
  constructor() {
    this._injectFunctions = [];
    this._classToTag = {};
  }

  onHandleDocs(ev) {
    const tags = ev.data.docs;
    tags.forEach((tag) => {
      this.parseInjectTo(tag);
      this.findClass(tag);
    });

    // This is where the function is injected to the class
    this._injectFunctions.forEach((func) => {
      const tag = func.originalTag;

      tag.kind = 'method';
      tag.static = false;
      tag.memberof = this.methodClassTag(this._classToTag[func.targetClass]);
      tag.name = func.targetName;
    });
  };

  parseInjectTo(tag) {
    const unknowns = tag.unknown;
    if (!unknowns) {
      return;
    }

    unknowns.forEach((unknown) => {
      if (unknown && unknown.tagName === '@injectTo') {
        this.handleInjectTo(unknown, tag);
      }
    });
  }

  handleInjectTo(unknownTag, tag) {
    const tagValue = unknownTag.tagValue;
    let targetCls;
    let targetName;
    let matches = tagValue.match(/\{(.*)\} as (.*)/);
    if (matches) {
      targetCls = matches[1];
      targetName = matches[2];
    } else {
      matches = tagValue.match(/\{(.*)\}/);
      targetCls = matches[1];
      targetName = tag.name;
    }

    if (!targetCls || !targetName) {
      return;
    }

    this._injectFunctions.push({
      'targetClass': targetCls,
      'targetName': targetName,
      'originalTag': tag,
    });
  }

  findClass(tag) {
    if (tag.kind === 'class') {
      this._classToTag[tag.name] = tag;
    }
  }

  methodClassTag(targetTag) {
    return targetTag.memberof + '~' + targetTag.name;
  }
}

module.exports = new InjectToPlugin();
