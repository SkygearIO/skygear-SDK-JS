import Container from '../container';
import {ReactNativePushContainer} from './push';
import {setStore} from '../store';
import reactNativeStore from './store';

class ReactNativeContainer extends Container {

  constructor() {
    super();

    this._push = new ReactNativePushContainer(this);
  }

}

setStore(reactNativeStore);

export default new ReactNativeContainer();
