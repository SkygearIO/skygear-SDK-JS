---
id: version-2.0.0-alpha.11-react-native.authcontainer
title: AuthContainer class
hide_title: true
original_id: react-native.authcontainer
---
<!-- Do not edit this file. It is automatically generated by API Documenter. -->


## AuthContainer class


<b>Signature:</b>

```typescript
export declare class AuthContainer<T extends BaseAPIClient> 
```

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)(parent)](./react-native.authcontainer._constructor_.md) |  | Constructs a new instance of the <code>AuthContainer</code> class |

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [currentIdentity](./react-native.authcontainer.currentidentity.md) |  | <code>Identity &#124; null</code> |  |
|  [currentSessionID](./react-native.authcontainer.currentsessionid.md) |  | <code>string &#124; null</code> |  |
|  [currentUser](./react-native.authcontainer.currentuser.md) |  | <code>User &#124; null</code> |  |
|  [extraSessionInfoOptions](./react-native.authcontainer.extrasessioninfooptions.md) |  | <code>ExtraSessionInfoOptions</code> |  |
|  [parent](./react-native.authcontainer.parent.md) |  | <code>Container&lt;T&gt;</code> |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [changePassword(newPassword, oldPassword)](./react-native.authcontainer.changepassword.md) |  |  |
|  [deleteOAuthProvider(providerID)](./react-native.authcontainer.deleteoauthprovider.md) |  |  |
|  [getSession(id)](./react-native.authcontainer.getsession.md) |  |  |
|  [linkOAuthProviderWithAccessToken(providerID, accessToken)](./react-native.authcontainer.linkoauthproviderwithaccesstoken.md) |  |  |
|  [listSessions()](./react-native.authcontainer.listsessions.md) |  |  |
|  [login(loginID, password, options)](./react-native.authcontainer.login.md) |  |  |
|  [loginOAuthProviderWithAccessToken(providerID, accessToken, options)](./react-native.authcontainer.loginoauthproviderwithaccesstoken.md) |  |  |
|  [loginWithCustomToken(token, options)](./react-native.authcontainer.loginwithcustomtoken.md) |  |  |
|  [logout()](./react-native.authcontainer.logout.md) |  |  |
|  [me()](./react-native.authcontainer.me.md) |  |  |
|  [persistResponse(response)](./react-native.authcontainer.persistresponse.md) |  |  |
|  [requestEmailVerification(email)](./react-native.authcontainer.requestemailverification.md) |  |  |
|  [requestForgotPasswordEmail(email)](./react-native.authcontainer.requestforgotpasswordemail.md) |  |  |
|  [resetPassword(form)](./react-native.authcontainer.resetpassword.md) |  |  |
|  [revokeOtherSessions()](./react-native.authcontainer.revokeothersessions.md) |  |  |
|  [revokeSession(id)](./react-native.authcontainer.revokesession.md) |  |  |
|  [saveExtraSessionInfoOptions()](./react-native.authcontainer.saveextrasessioninfooptions.md) |  |  |
|  [signup(loginIDs, password, options)](./react-native.authcontainer.signup.md) |  |  |
|  [signupWithEmail(email, password, options)](./react-native.authcontainer.signupwithemail.md) |  | signupWithEmail is a shorthand of [the signup() method](./react-native.authcontainer.signup.md)<!-- -->. |
|  [signupWithUsername(username, password, options)](./react-native.authcontainer.signupwithusername.md) |  | signupWithUsername is a shorthand of [the signup() method](./react-native.authcontainer.signup.md)<!-- -->. |
|  [updateMetadata(metadata)](./react-native.authcontainer.updatemetadata.md) |  |  |
|  [updateSession(id, patch)](./react-native.authcontainer.updatesession.md) |  |  |
|  [verifyWithCode(code)](./react-native.authcontainer.verifywithcode.md) |  |  |

