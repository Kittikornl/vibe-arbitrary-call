# Custom Call FE - Rabby Wallet Integration

A modern React frontend application that allows users to send any calldata to any contract using the Rabby wallet or MetaMask.

## Features

- 🔗 **Wallet Integration**: Connect to Rabby wallet or MetaMask
- 📝 **Custom Transactions**: Send any calldata to any contract
- 🎨 **Modern UI**: Beautiful, responsive interface built with Tailwind CSS
- 📊 **Transaction History**: Track and view recent transactions
- ⚡ **Real-time Status**: See transaction success/failure status
- 🔧 **Advanced Options**: Configure gas settings, value, and EIP-1559 parameters
- 🛡️ **Input Validation**: Comprehensive form validation for safe transactions

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Rabby wallet or MetaMask browser extension

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd custom-call-fe
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### 1. Connect Wallet
- Click "Connect Wallet" button
- Approve the connection in your Rabby wallet or MetaMask
- The app will display your connected address and network

### 2. Send Transaction
- Enter the contract address you want to interact with
- Provide the calldata in hex format (e.g., `0xa9059cbb...`)
- Optionally set gas parameters and ETH value
- Click "Send Transaction" and approve in your wallet

### 3. View History
- Check the transaction history panel on the right
- View transaction status, hash, and any errors
- Clear history when needed

## Example Transactions

### ERC-20 Transfer
```javascript
// Contract: DAI Token (0x6B175474E89094C44Da98b954EedeAC495271d0F)
// Function: transfer(address to, uint256 amount)
// To: 0xd8da6bf26964af9d7eed9e03e53415d37aa96045 (Vitalik's address)
// Amount: 0 tokens

Contract Address: 0x6B175474E89094C44Da98b954EedeAC495271d0F
Calldata: 0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa960450000000000000000000000000000000000000000000000000000000000000000
```

### ERC-721 Approve
```javascript
// Contract: Any NFT Contract
// Function: approve(address to, uint256 tokenId)
// To: 0x1234567890123456789012345678901234567890
// Token ID: 1

Contract Address: [NFT_CONTRACT_ADDRESS]
Calldata: 0x095ea7b300000000000000000000000012345678901234567890123456789012345678900000000000000000000000000000000000000000000000000000000000000001
```

## Supported Networks

The application supports multiple networks including:
- Ethereum Mainnet
- Polygon
- BNB Smart Chain
- Arbitrum One
- And any other network your wallet supports

## Technical Details

### Architecture
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Wallet Integration**: Web3 Provider API
- **State Management**: React Hooks
- **Build Tool**: Create React App

### Key Components
- `WalletConnect`: Handles wallet connection and status
- `TransactionForm`: Form for transaction input and validation
- `TransactionHistory`: Displays transaction history and status
- `App`: Main application orchestrator

### Security Features
- Input validation for addresses and calldata
- Error handling and user feedback
- Transaction confirmation through wallet
- No private key exposure

## Development

### Project Structure
```
src/
├── components/          # React components
│   ├── WalletConnect.tsx
│   ├── TransactionForm.tsx
│   └── TransactionHistory.tsx
├── types/              # TypeScript type definitions
│   └── wallet.ts
├── utils/              # Utility functions
│   └── wallet.ts
├── App.tsx             # Main application component
└── index.tsx           # Application entry point
```

### Available Scripts
- `npm start`: Start development server
- `npm build`: Build for production
- `npm test`: Run tests
- `npm eject`: Eject from Create React App

## Troubleshooting

### Common Issues

1. **Wallet not detected**
   - Ensure Rabby wallet or MetaMask is installed
   - Check if the wallet extension is enabled
   - Try refreshing the page

2. **Transaction fails**
   - Verify the contract address is correct
   - Check that the calldata is valid hex format
   - Ensure you have sufficient gas and ETH
   - Verify you're on the correct network

3. **Network issues**
   - Switch to the correct network in your wallet
   - Add the network to your wallet if not available

### Debug Mode
Enable debug logging by opening browser console and checking for error messages.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Disclaimer

This application allows you to send any calldata to any contract. Use with caution and always verify:
- Contract addresses
- Transaction data
- Gas settings
- Network selection

The developers are not responsible for any losses incurred from incorrect transaction data or malicious contracts. 