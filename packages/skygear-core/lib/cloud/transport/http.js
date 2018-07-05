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
import http from 'http';

import registry from '../registry';
import {
  settings
} from '../settings';
import { SkygearError } from '../../error';
import CommonTransport from './common';
import { createLogger } from '../logging';


class HTTPTransport extends CommonTransport {
  constructor(reg) {
    super(reg);

    this.registry = reg;
    this.dispatch = this.dispatch.bind(this);
    this.readReq = this.readReq.bind(this);
    this.server = null;
    this.logger = createLogger('plugin').child({tag: 'plugin'});
  }

  start() {
    if (this.server !== null) {
      throw new Error('HTTPTransport can only start once.');
    }
    this.server = http.createServer(this.readReq);
    this.server.on('clientError', (err, socket) => {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });
    this.server.on('error', (err) => {
      this.logger.error(err);
    });

    const {
      address,
      port
    } = settings.http;

    this.logger.info(`Listening ${address} on port ${port}...`);
    this.server.listen(port, address);
  }

  close() {
    this.server.close();
    this.server = null;
  }

  readReq(req, res) {
    req.setEncoding('utf8');
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      let data;
      try {
        data = JSON.parse(body);
      } catch (e) {
        this.writeError(res, 400, 'Invalid request body', e);
        return;
      }
      try {
        this.dispatch(data, res);
      } catch (e) {
        this.writeError(res, 500, 'Internal server error', e);
        this.logger.warn({err: e});
        return;
      }
    });
  }

  async dispatch(payload, res) {
    const handlerName = payload.kind + 'Handler';
    if (!this[handlerName]) {
      this.writeError(res, 400, `func kind ${payload.kind} is not supported`);
      this.logger.log(`func kind ${payload.kind} is not supported`);
      return;
    }

    const {
      context
    } = payload;

    const logger = createLogger('plugin', context);

    try {
      const resolved = await this[handlerName](payload);
      this.writeResponse(res, resolved);
    } catch (err) {
      let responseError = err;
      if (err instanceof SkygearError) {
        // do nothing
      } else if (err !== null && err !== undefined) {
        logger.error({err: err}, 'Catching unexpected error: %s', err);
        responseError = new SkygearError(err.toString());
      } else {
        logger.error('Catching err but value is null or undefined.');
        responseError = new SkygearError('An unexpected error has occurred.');
      }
      this.writeResponse(res, {
        error: responseError.toJSON()
      });
    }
  }

  writeResponse(res, result) {
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    res.write(JSON.stringify(result));
    res.end();
  }

  writeError(res, code, message, error) {
    res.writeHead(code, {
      'Content-Type': 'application/json'
    });
    res.write(error ? `${message}\r\n${error}` : message);
    res.end();
  }
}

const transport = new HTTPTransport(registry);

export default transport;
