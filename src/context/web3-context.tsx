import React, { useEffect, useState, useRef, PropsWithChildren } from 'react'
import type { JsonRpcProvider } from '@ethersproject/providers/src.ts/json-rpc-provider'
import { ethers } from 'ethers'
import isString from 'is-string'
import { toHex } from '../utils'
import { ContractInterface } from '@ethersproject/contracts/src.ts/index'

export interface Web3ContextValue {
  chainId?: number
  account?: string | null
  provider: JsonRpcProvider
  connect: () => void
  switchNetwork: (chainId: number) => void
  updateContext?: (
    key: keyof Web3ContextValue | Partial<Web3ContextValue>,
    data?: any,
  ) => void
}

const provider = window.ethereum
  ? new ethers.providers.Web3Provider(window.ethereum as any, 'any')
  : new ethers.providers.JsonRpcProvider(
      'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    )

const switchNetwork = async (chainId: number) => {
  await provider.send('wallet_switchEthereumChain', [
    { chainId: toHex(chainId) },
  ])
}

const connect = async () => {
  await provider.send('eth_requestAccounts', [])
}

function getInitialValue() {
  return {
    provider,
    connect,
    switchNetwork,
  }
}

export const Web3Context = React.createContext<Web3ContextValue>(
  getInitialValue(),
)

export type Web3ContractConfig = {
  chainId: number
  abi: ContractInterface
  address: string
}

export type Web3ProviderProps = PropsWithChildren<{
  contracts?: {
    [key: string]: Web3ContractConfig
  }
  defaultProvider?: JsonRpcProvider
  chainId?: number
}>

export const Web3ContextProvider = (props: Web3ProviderProps) => {
  const {
    contracts = {},
    children,
    chainId: defaultChanId = 1,
    defaultProvider,
  } = props

  const rerender = useState<object>()[1]

  const updateContext = (
    key: keyof Web3ContextValue | Partial<Web3ContextValue>,
    data?: any,
  ) => {
    context.current = {
      ...context.current,
      ...(isString(key)
        ? { [key as keyof Web3ContextValue]: data }
        : (key as Partial<Web3ContextValue>)),
    }
    rerender({})
  }

  const context = useRef<Web3ContextValue>(
    Object.assign(getInitialValue(), {
      updateContext,
    }),
  )

  const load = async () => {
    const chainId = (await provider.getNetwork())?.chainId
    const currentProvider =
      (chainId === defaultChanId ? provider : defaultProvider) || provider
    const signer = await currentProvider.getSigner()
    const availableContracts = Object.keys(contracts)
      .filter((key) => {
        const contract = contracts[key]
        return chainId === contract.chainId
      })
      .map((key) => {
        return {
          key,
          contract: new ethers.Contract(
            contracts[key].address,
            contracts[key].abi,
            signer,
          ),
        }
      })
    let account: string | null = null
    try {
      account = await signer.getAddress()
    } catch (e) {
      console.log(e, 'error')
    }
    updateContext?.({
      account,
      chainId,
      contracts: availableContracts.reduce((prev, { key, contract }) => {
        return {
          ...prev,
          [key]: contract,
        }
      }, {}),
    } as Partial<Web3ContextValue>)
  }

  useEffect(() => {
    load()

    if (window.ethereum) {
      window.ethereum.on('connect', load)

      window.ethereum.on('disconnect', load)

      window.ethereum.on('accountsChanged', load)

      window.ethereum.on('networkChanged', load)
    }
  }, [])

  return (
    <Web3Context.Provider value={context.current}>
      {children}
    </Web3Context.Provider>
  )
}
