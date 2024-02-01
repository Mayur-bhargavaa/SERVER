const chai = require('chai');
const chaiHttp = require('chai-http');
const { app, server } = require('../index'); // Adjust the path based on your project structure

chai.use(chaiHttp);
const { expect } = chai;

describe('API Tests', () => {
  after(() => {
    // Close the server after tests
    server.close();
  });

  it('should return a welcome message', (done) => {
    chai.request(server) // Use the server object, not the app object
      .get('/')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.message).to.equal('Welcome to your API!');
        done();
      });
  });
});
