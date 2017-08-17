/**
 * Copyright 2015 Oursky Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import _ from 'lodash';

/**
 * Geolocation
 *
 * A model representing a latlong location in Skygear record.
 */
export default class Geolocation {

  /**
   * Constructs a new Geolocation object.
   *
   * @param  {Number} latitude - latitude of the location
   * @param  {Number} longitude - longitude of the location
   */
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
    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude is not in expected range (-180, 180)');
    }

    /**
     * Latitude
     *
     * @type {Number}
     */
    this.latitude = latitude;

    /**
     * Longitude
     *
     * @type {Number}
     */
    this.longitude = longitude;
  }

  /**
   * Serializes Geolocation to a JSON object.
   *
   * @return {Object} the JSON object
   */
  toJSON() {
    return {
      $lat: this.latitude,
      $lng: this.longitude,
      $type: 'geo'
    };
  }

  /**
   * Constructs a new Geolocation object from JSON object.
   *
   * @param {Object} attrs - the JSON object
   * @param {Number} attrs.$latitude - latitude of the location
   * @param {Number} attrs.$longitude - longitude of the location
   */
  static fromJSON(attrs) {
    return new Geolocation(attrs.$lat, attrs.$lng);
  }

}
