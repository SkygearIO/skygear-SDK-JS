import { expect } from 'chai';
import { databaseConfigFromURL } from '../../lib/cloud/pgurl';

describe('databaseConfigFromURL', function () {
  it('parses postgres://', function () {
    expect(databaseConfigFromURL('postgres://')).to.be.eql({
      ssl: true
    });
  });
  it('parses postgres://localhost', function () {
    expect(databaseConfigFromURL('postgres://localhost')).to.be.eql({
      host: 'localhost',
      ssl: true
    });
  });
  it('parses postgres://localhost:5432', function () {
    expect(databaseConfigFromURL('postgres://localhost:5432')).to.be.eql({
      host: 'localhost',
      port: 5432,
      ssl: true
    });
  });
  it('parses postgres:///mydb', function () {
    expect(databaseConfigFromURL('postgres:///mydb')).to.be.eql({
      database: 'mydb',
      ssl: true
    });
  });
  it('parses postgres://?sslmode=disable', function () {
    expect(databaseConfigFromURL('postgres://?sslmode=disable')).to.be.eql({
      ssl: false
    });
  });
  it('parses postgres://user@localhost', function () {
    expect(databaseConfigFromURL('postgres://user@localhost')).to.be.eql({
      user: 'user',
      host: 'localhost',
      ssl: true
    });
  });
  it('parses postgres://user:@localhost', function () {
    expect(databaseConfigFromURL('postgres://user:@localhost')).to.be.eql({
      user: 'user',
      password: '',
      host: 'localhost',
      ssl: true
    });
  });
  it('parses postgres://user:password@localhost', function () {
    expect(databaseConfigFromURL('postgres://user:password@localhost'))
      .to.be.eql({
        user: 'user',
        password: 'password',
        host: 'localhost',
        ssl: true
      });
  });
});
