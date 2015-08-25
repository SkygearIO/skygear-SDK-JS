class Container {

  constructor() {
    this.url = 'http://ourd.pandawork.com/';
  }

  get endPoint() {
    return this.url;
  }

  set endPoint(newEndPoint) {
    // TODO: Check the format
    if (newEndPoint) {
      this.url = newEndPoint;
    }
  }

}

export default Container;
