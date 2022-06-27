import React, {useEffect, useState, useRef, PropsWithChildren} from 'react';
import type {JsonRpcProvider} from "@ethersproject/providers/src.ts/json-rpc-provider";
import { ethers } from "ethers";
import isString from 'is-string';
import {toHex} from "../utils";

export interface Web3ContextValue {
  chainId?: number,
  account?: string | null,
  provider: JsonRpcProvider,
  connect: () => void,
  switchNetwork: (chainId: number) => void,
  updateContext?: (key: keyof Web3ContextValue | Partial<Web3ContextValue>, data?: any) => void
}

const provider = window.ethereum ? new ethers.providers.Web3Provider(window.ethereum as any, "any") :  new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');


const switchNetwork = async (chainId: number) => {
  await provider.send('wallet_switchEthereumChain', [{ chainId: toHex(chainId) }]);
}

const connect = async () => {
  await provider.send("eth_requestAccounts", []);
}

function getInitialValue() {
  return {
    provider,
    connect,
    switchNetwork,
  };
}

export const Web3Context = React.createContext<Web3ContextValue>(getInitialValue());


export const Web3ContextProvider = (props: PropsWithChildren) => {

  const rerender = useState<{}>()[1]

  const updateContext = (key: keyof Web3ContextValue | Partial<Web3ContextValue>, data?: any) => {
    context.current = {
      ...context.current,
      ...(isString(key) ? { [key as keyof Web3ContextValue]: data } : key as Partial<Web3ContextValue>)
    }
    rerender({});
  }

  const context = useRef<Web3ContextValue>(Object.assign(getInitialValue(), {
    updateContext,
  }))

  const load= async () => {
    try {
      const signer = await provider.getSigner()
      const account = await signer.getAddress()
      const chainId = (await provider.getNetwork())?.chainId;
      if(account || chainId) {
        updateContext?.({
          account,
          chainId,
        } as Partial<Web3ContextValue>)
      }
    }catch (e) {
      console.log(e, 'error');
      updateContext?.({
        account: null,
      } as Partial<Web3ContextValue>)
    }
  }

  useEffect(() => {
    load()

    if(window.ethereum) {
      window.ethereum.on('connect', load)

      window.ethereum.on('disconnect', load)

      window.ethereum.on('accountsChanged', load)

      window.ethereum.on("networkChanged", load);
    }
  }, [])

  return <Web3Context.Provider value={context.current}>
    {props.children}
  </Web3Context.Provider>
}
