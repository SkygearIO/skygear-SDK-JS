import reactNative from 'react-native';
import Container from '../container';
import {setStore} from '../store';
import reactNativeStore from './store';

class ReactNativeContainer extends Container {
  inferDeviceType() {
    if (reactNative.Platform.OS === 'ios') {
      return 'ios';
    }
    return 'android';
  }
}

setStore(reactNativeStore);

export default new ReactNativeContainer();
