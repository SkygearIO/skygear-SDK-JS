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
import CommonTransport from './common';


class HTTPTransport extends CommonTransport {
  constructor(reg) {
    super(reg);

    this.registry = reg;
    this.dispatch = this.dispatch.bind(this);
    this.readReq = this.readReq.bind(this);
    this.server = null;
  }

  start() {
    if (this.server !== null) {
      throw new Error('HTTPTransport can only start once.');
    }
    this.server = http.createServer(this.readReq);
    this.server.on('clientError', (err, socket) => {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });
    this.server.on('error', (err, socket) => {
      socket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    });

    const {
      address,
      port
    } = settings.http;

    console.info(`Listening ${address} on port ${port}...`);
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
      const data = JSON.parse(body);
      try {
        this.dispatch(data, res);
      } catch (e) {
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.write(`Internal server error\r\n${e}`);
        res.end();
        console.warn(e.stack);
        return;
      }
    });
  }

  dispatch(payload, res) {
    const handlerName = payload.kind + 'Handler';
    if (!this[handlerName]) {
      res.writeHead(400, {
        'Content-Type': 'application/json'
      });
      console.log(`func kind ${payload.kind} is not supported`);
      res.write(`func kind ${payload.kind} is not supported`);
      res.end();
      return;
    }

    this[handlerName](payload).then((resolved) => {
      this.writeResponse(res, resolved);
    }).catch((err) => {
      this.writeResponse(res, {
        error: err.toString()
      });
    });
  }

  writeResponse(res, result) {
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    res.write(JSON.stringify(result));
    res.end();
  }
}

const transport = new HTTPTransport(registry);

export default transport;
