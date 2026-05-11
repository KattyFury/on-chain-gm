export const GM_CONTRACT_ADDRESS =
  '0x3f8947EC3157D5B2C9a5D1b583eFB961AA653263' as const

export const GM_ABI = [
  {
    type: 'function',
    name: 'gm',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'totalGMs',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'gmCount',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'GMSent',
    inputs: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const
