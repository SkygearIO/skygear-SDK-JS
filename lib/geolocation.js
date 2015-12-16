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
