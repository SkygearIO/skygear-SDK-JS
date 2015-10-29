import _ from 'lodash';
import Geolocation from './geolocation';

export function toJSON(v) {
  if (_.isArray(v)) {
    return _.map(v, toJSON);
  } else if (_.isDate(v)) {
    return {
      $type: 'date',
      $value: v.toJSON()
    };
  } else if (v.toJSON) {
    return v.toJSON();
  } else if (_.isObject(v)) {
    return _.chain(v)
      .map((value, key) => {
        return [key, toJSON(value)];
      })
      .object()
      .value();
  } else {
    return v;
  }
}

export function fromJSON(attrs) {
  switch (attrs.$type) {
    case 'geo':
      return Geolocation.fromJSON(attrs);
    case 'date':
      return new Date(attrs.value);
    default:
      return attrs;
  }
}
