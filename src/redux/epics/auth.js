import { ActionTypes } from '../constants';
import { getSessionSuccess, loginSuccess, logoutSuccess, registSuccess, registConfirmSuccess } from '../actions';

import { ofType } from 'redux-observable';
import { map, tap, mergeMap } from 'rxjs/operators';
import { from, of } from 'rxjs';

import * as AWSCognito from 'amazon-cognito-identity-js';


const poolData = {
    UserPoolId: '',
    ClientId: ''
};

const userPool = new AWSCognito.CognitoUserPool(poolData);

export const GetSession = action$ =>
    action$.pipe(
        ofType(ActionTypes.AUTH_GET_SESSION),
        map(_ => userPool.getCurrentUser()),
        mergeMap(user => {

            return !user ? of(null) : from(new Promise(resolve =>
                user.getSession((err, session) => resolve(err ? null : session.idToken.payload))
            ))

        }),        
        map(e => getSessionSuccess(e))
    );

export const Login = (action$, store$) => 
    action$.pipe(
        ofType(ActionTypes.AUTH_LOGIN),
        tap(_ => {
            let { login_email, login_password } = store$.value.form;

            console.log('login epic:', login_email, login_password)

        }),
        mergeMap(_ => {

            let { login_email, login_password } = store$.value.form,
                user = new AWSCognito.CognitoUser({ Pool : userPool, Username : login_email })

            return from(new Promise(resolve =>
                user.authenticateUser(
                    new AWSCognito.AuthenticationDetails({
                        Username: login_email,
                        Password: login_password
                    }),
                    {
                        onSuccess: data => resolve({ accessToken : data.getAccessToken().getJwtToken() }),
                        onFailure: err => resolve({ })
                    }
                )
            ))

        }),
        map(e => loginSuccess(e))
    );

export const Logout = action$ => 
    action$.pipe(
        ofType(ActionTypes.AUTH_LOGOUT),
        map(_ => userPool.getCurrentUser()),
        map(user => user.signOut()),
        map(_ => logoutSuccess(true))
    );

export const Regist = (action$, store$) => 
    action$.pipe(
        ofType(ActionTypes.AUTH_REGIST),
        tap(_ => {
            let { regist_email, regist_password } = store$.value.form;

            console.log('regist epic:', regist_email, regist_password)

        }),
        mergeMap(_ => {
            
            let { regist_email, regist_password } = store$.value.form;

            return from(new Promise(resolve =>
                userPool.signUp(
                    regist_email,
                    regist_password,
                    [
                        { Name: 'email', Value: regist_email }
                    ],
                    null,
                    (err, data) => 
                        resolve(err ? {} : { email : data.user.getUsername() })
                )
            ))

        }),
        map(e => registSuccess(e))
    );

export const RegistConfirm = (action$, store$) => 
    action$.pipe(
        ofType(ActionTypes.AUTH_REGIST_CONFIRM),
        tap(_ => {
            let { regist_confirm_email, regist_confirm_code } = store$.value.form;

            console.log('regist_confirm epic:', regist_confirm_email, regist_confirm_code)
            
        }),
        mergeMap(_ => {

            let { regist_confirm_email, regist_confirm_code } = store$.value.form,
                user = new AWSCognito.CognitoUser({ Pool : userPool, Username : regist_confirm_email })

            return from(new Promise(resolve =>
                user.confirmRegistration(
                    regist_confirm_code,
                    true,
                    (err, data) => 
                        resolve(err ? {} : { state : data })
                )
            ))

        }),
        map(e => registConfirmSuccess(e))
    );