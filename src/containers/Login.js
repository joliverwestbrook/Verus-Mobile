/*
  This component's purpose is to present the user with the option 
  to log into their accounts, and will only be shown if at least on account 
  exists on the mobile device. It uses the user-entered username and password
  to find and decrypt the wallet seed in asyncStorage. When mounted, it clears
  any detecting app update heartbeats located from before, and upon successfull 
  login, creates a new update heartbeat interval.
*/

import React, { Component } from "react";
import { Icon, FormLabel, FormInput, FormValidationMessage } from "react-native-elements";
import Button1 from "../symbols/button1";
import { 
  View, 
  StyleSheet, 
  Text, 
  Keyboard, 
  TouchableWithoutFeedback, 
  ActivityIndicator, 
} from "react-native";
import { connect } from 'react-redux';
import { 
  validateLogin, 
  setUserCoins, 
  everythingNeedsUpdate, 
  fetchActiveCoins,
  setUpdateIntervalID
 } from '../actions/actionCreators';
import { Dropdown } from 'react-native-material-dropdown';

const UPDATE_INTERVAL = 60000

class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      password: null,
      selectedAccount: {id: null},
      loading: false,
      validating: false,
      errors: {selectedAccount: null, password: null}
    };
  }

  componentWillMount() {
    if (this.props.updateIntervalID) {
      console.log("Update interval ID detected as " + this.props.updateIntervalID + ", clearing...")
      clearInterval(this.props.updateIntervalID)
      this.props.dispatch(setUpdateIntervalID(null))
    }
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    const account = this.state.selectedAccount;
    this.setState({validating: true})

    validateLogin(account, this.state.password)
      .then(response => {
        if(response !== false) {
          this.setState({loading: true})
          let promiseArr = [fetchActiveCoins(), response]
          return Promise.all(promiseArr);
        }
        else {
          this.setState({validating: false})
          throw new Error("Account not validated")
        }
      })
      .then((resArr) => {
        const validation = resArr[1]
        const coinList = resArr[0]
        const coinsForUser = setUserCoins(coinList.activeCoinList, account.id);

        this.props.dispatch(coinList)
        this.props.dispatch(coinsForUser)
        this.signInWithHeartbeat(validation)
      })
      .catch(err => {return err});
  }

  handleError = (error, field) => {
    let _errors = this.state.errors
    _errors[field] = error

    this.setState({errors: _errors})
  }

  validateFormData = () => {
    this.setState({
      errors: {selectedAccount: null, password: null}
    }, () => {
      const _selectedAccount = this.state.selectedAccount
      const _password = this.state.password

      let _errors = false;

      if (!_selectedAccount.id) {
        this.handleError("Select an account", "selectedAccount")
        _errors = true
      } 

      if (!_password || _password.length < 1) {
        this.handleError("Required field", "password")
        _errors = true
      } 

      if (!_errors) {
        this._handleSubmit()
      } else {
        return false;
      }
    });
  }

  signInWithHeartbeat = (signInAction) => {
    this.props.dispatch(everythingNeedsUpdate())
    let intervalID = setInterval(() => {
      console.log("Everything needs to update interval")
      this.props.dispatch(everythingNeedsUpdate())
    }, UPDATE_INTERVAL);

    this.props.dispatch(setUpdateIntervalID(intervalID))
    this.props.dispatch(signInAction)
  }

  _handleAddUser = () => {
    let navigation = this.props.navigation;
    navigation.navigate("SignedOutNoKey")
  }

  _selectAccount = (index) => {
    let account = this.props.accounts[index]
    this.setState({selectedAccount: account})
  }

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.root}>
          <Icon
            name="lock"
            color="#009B72"
            size={36}
          />
          <Text style={styles.loginLabel}>
            Wallet Login
          </Text>
          <View style={styles.dropDownContainer}>
            <Dropdown
              containerStyle={styles.dropDown}
              labelExtractor={(item, index) => {
                return item.id
              }}
              valueExtractor={(item, index) => {
                return item
              }}
              data={this.props.accounts}
              onChangeText={(value, index, data) => {
                this.setState({selectedAccount: value})
                //this.passwordInput.focus();
              }}
              textColor="#E9F1F7"
              selectedItemColor="#232323"
              baseColor="#E9F1F7"
              label="Select Account..."
            />
          </View>
          <View style = {styles.valueContainer}>
            <FormValidationMessage>
              {
                this.state.errors.selectedAccount ? 
                  this.state.errors.selectedAccount
                  :
                  null
              }
            </FormValidationMessage>
          </View>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
              Enter password:
            </FormLabel>
            <FormInput 
              underlineColorAndroid="#86939d"
              onChangeText={(text) => this.setState({password: text})}
              autoCapitalize={"none"}
              autoCorrect={false}
              secureTextEntry={true}
              shake={this.state.errors.password}
              inputStyle={styles.formInput}
              ref={(input) => { this.passwordInput = input; }}
            />
            <FormValidationMessage>
              {
                this.state.errors.password ? 
                  this.state.errors.password
                  :
                  null
              }
            </FormValidationMessage>
          </View>

          {this.state.loading ? 
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Unlocking Wallet</Text>
              <ActivityIndicator animating={this.state.loading} size="large"/>
            </View>
          :
            this.state.validating ? 
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Validating User</Text>
                <ActivityIndicator animating={this.state.validating} size="large"/>
              </View>
            :
              <View>
                <Button1 
                style={styles.unlockButton} 
                buttonContent="Unlock"
                onPress={this.validateFormData} 
                />
                <Button1 
                style={styles.addUserButton} 
                buttonContent="Add User"
                onPress={this._handleAddUser} 
                />
              </View>
            }
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    accounts: state.authentication.accounts,
    activeCoinList: state.coins.activeCoinList,
    updateIntervalID: state.ledger.updateIntervalID
  }
};

export default connect(mapStateToProps)(Login);

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
  },
  loginLabel: {
    backgroundColor: "transparent",
    fontSize: 22,
    color: "#E9F1F7",
    width: "85%",
    textAlign: "center"
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
  },
  valueContainer: {
    width: "85%",
  },
  dropDownContainer: {
    width: "85%",
    alignItems: "center"
  },
  formInput: {
    width: "100%",
  },
  dropDown: {
    width: "90%",
    marginBottom: 0,
    marginTop: 0,
  },
  unlockButton: {
    height: 45,
    width: 130,
    marginBottom: 0,
    marginTop: 35,
    backgroundColor: "#009B72",
  },
  addUserButton: {
    height: 45,
    width: 130,
    marginBottom: 100,
    marginTop: 10,
    backgroundColor: "#2E86AB",
  },
  loadingContainer: {
    width: 400,
    backgroundColor: "transparent",
    justifyContent: "center",
    paddingBottom: 0,
    paddingTop: 0,
    marginBottom: 8,
    marginTop: 28
  },
  loadingText: {
    backgroundColor: "transparent",
    opacity: 0.86,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },
});
