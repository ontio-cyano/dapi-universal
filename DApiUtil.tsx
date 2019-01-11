/**
 * This class is an example of a mobile phone and PC-side calling wallet plugin 
 * that shows how to use the PC and mobile phone calls.
 */
import axios from 'axios';
import { client } from 'cyanobridge';
export class DApiUtil {
  /**
   * init 
   */
  static init() {
    if (DApiUtil.isPC()) {
      const Ontology = require('ontology-dapi');
      Ontology.client.registerClient({});
    } else {
      client.registerClient();
    }
  }

  /**
   * get account
   */
  static async getAccount(): Promise<string> {
    if (DApiUtil.isPC()) {
      const Ontology = require('ontology-dapi');
      return await Ontology.client.api.asset.getAccount();
    } else {
      const params = {dappName: 'My dapp', dappIcon: ''};
      const res = await client.api.asset.getAccount(params);
      // @ts-ignore
      return Promise.resolve(res.result);
      // return Promise.resolve('');
    }
  }
  
  /**
   * 
   * @param scriptHash
   * @param operation
   * @param invokeArgs
   * @param gasPrice
   * @param gasLimit
   * @param requireIdentity
   */
  static async invoke({ scriptHash, operation, invokeArgs, gasPrice, gasLimit, requireIdentity }: {
    scriptHash: string;
    operation: string;
    invokeArgs?: any[];
    gasPrice?: number;
    gasLimit?: number;
    requireIdentity?: boolean; }): Promise<any> {
    if (DApiUtil.isPC()) {
      const Ontology = require('ontology-dapi');
      const args = invokeArgs.map((raw) => ({
        type: raw.type,
        value: DApiUtil.convertValue(raw.value, raw.type)
      }));
      return await Ontology.client.api.smartContract.invoke({ scriptHash, operation, args, gasPrice, gasLimit, requireIdentity });
    } else {
      const config = {login: true, message: 'invoke smart contract', url: ''};
      const address = 'Current login address';
      if (address) {
        const payer = address;
        const args = invokeArgs;
        // @ts-ignore
        const params = {scriptHash, operation, args, gasPrice, gasLimit, payer, config};
        const res = await client.api.smartContract.invoke(params);
        // @ts-ignore
        if (res.error === 0) {
          // @ts-ignore
          return await DApiUtil.getNotify(res.result, scriptHash);
        } else {
          return Promise.reject('error');
        }
      } else {
        return Promise.reject('please login');
      }
    }
  }

  /**
   * get balance
   * @param address 
   */
  static async getBalance(address): Promise<any> {
    const res = await DApiUtil.queryBalance(address);
    return res;
  }

  /**
   * @param value
   * @param type
   */
  static convertValue(value: string, type: any) {
    if (DApiUtil.isPC()) {
      const ontology = require('ontology-dapi');
      switch (type) {
        case 'Boolean':
          return Boolean(value);
        case 'Integer':
          return Number(value);
        case 'ByteArray':
          return value;
        case 'String':
          return ontology.client.api.utils.strToHex(value);
      }
    }
  }

  /**
   * get contract notify infomation
   * @param txhash : txhash from inkove contract
   * @param scriptHash : contract address
   */
  static getNotify(txhash, scriptHash): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        axios.get('https://dappnode1.ont.io:10334/api/v1/smartcode/event/txhash/' + txhash)
          .then((result) => {
            if (result.data.Error === 0) {
              try {
                // @ts-ignore
                const notify = result.data.Result.Notify;
                let exist = false;
                let states;
                for (const n of notify) {
                  if (n.ContractAddress === scriptHash) {
                    states = n.States;
                    exist = true;
                    break;
                  }
                }
                if (exist) {
                  clearInterval(timer);
                  const rsp = { result : [states],  transaction : result.data.Result.TxHash};
                  resolve(rsp);
                }
              } catch (e) {
                reject('error');
                // tslint:disable-next-line:no-console
                console.log('onScCall error:', e);
              }
            }
          }).catch((e) => {
            reject(e);
          });
      }, 3000);
    });
  }

  /**
   * get all token balance from this address
   * @param address : wallet address
   */
  static queryBalance(address): Promise<any> {
    return new Promise((resolve, reject) => {
      axios.get('https://explorer.ont.io/api/v1/explorer/address/' + address.address + '/20/0')
        .then((result) => {
          if (result.data.Error === 0) {
            // @ts-ignore
            const balance = result.data.Result.AssetBalance;
            const assets: {[key: string]: number} = {};
            for (const n of balance) {
              // @ts-ignore
              const assetName = n.AssetName;
              // @ts-ignore
              const value = n.Balance;
              assets[assetName] = value;
            }
            resolve(assets);
          }
        });
    });
  }

  /**
   * is pc
   */
  static isPC() {
    const userAgentInfo = navigator.userAgent;
    const Agents = ['Android', 'iPhone', 'SymbianOS', 'Windows Phone', 'iPad', 'iPod'];
    let flag = true;
    for (const v of Agents) {
      if (userAgentInfo.indexOf(v) > 0) {
        flag = false;
        break;
      }
    }
    return flag;
  }
}
