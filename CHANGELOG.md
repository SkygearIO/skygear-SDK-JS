## 0.4.0 (2016-01-13)

### Features

- Allow client to listen to pubsub open/close events. #132

## 0.3.0 (2016-01-06)

### Features

- Automatically logout user when access token is not accepted #129

### Bug Fixes

- Prevent uploaded asset from being uploaded again #109
- Fix not able to register device if the existing device ID is not found #125

## 0.2.0 (2015-12-23)

### Bug Fixes

- Check if file exists before uploading asset oursky/skygear#454
- Fix error when AsyncStorage not available in web browser
- Use console.log instead of console.debug for React Native
- Fix bug on platform detection in react-native for iOS
- Use the pass in value to resolve the store promise in container
- Fix store not usable in react-native

## 0.1.0 (2015-12-16)

### Features

- Support cached query
- Support Auto-Increment ID

### Bug Fixes

- Fix React Native local storage bugs
- Fix upload filw with `+`
- Fix bug on platform detection at react native iOS
