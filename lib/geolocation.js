import _ from 'lodash';

export default class Geolocation {

  constructor(latitude, longitude) {
    if (!_.isNumber(latitude)) {
      throw new Error('Latitude is not a number');
    }
    if (!_.isNumber(longitude)) {
      throw new Error('Longitude is not a number');
    }
    this.latitude = latitude;
    this.longitude = longitude;
  }

  toJSON() {
    return {
      $lat: this.latitude,
      $lng: this.longitude,
      $type: 'geo'
    };
  }

  static fromJSON(attrs) {
    return new Geolocation(attrs.$lat, attrs.$lng);
  }

}
