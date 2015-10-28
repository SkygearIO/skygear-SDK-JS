import _ from 'lodash';

export default class Geolocation {

  constructor(latitude, longitude) {
    if (!_.isNumber(latitude)) {
      throw new Error('Latitude is not a number');
    }
    if (latitude < -90 || latitude > 90) {
      throw new Error('Latitude is not in expected range (-90, 90)');
    }
    if (!_.isNumber(longitude)) {
      throw new Error('Longitude is not a number');
    }
    if (longitude < -180 || latitude > 180) {
      throw new Error('Longitude is not in expected range (-180, 180)');
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
