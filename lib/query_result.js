export default class QueryResult extends Array {
  static createFromResult(records, info) {
    let result = QueryResult.from(records);
    result._overallCount = info ? info.count : undefined;
    return result;
  }

  get overallCount() {
    return this._overallCount;
  }
}

