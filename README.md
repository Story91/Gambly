# MiniKit Template

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-onchain --mini`](), configured with:

- [MiniKit](https://docs.base.org/builderkits/minikit/overview)
- [OnchainKit](https://www.base.org/builders/onchainkit)
- [Tailwind CSS](https://tailwindcss.com)
- [Next.js](https://nextjs.org/docs)

## Getting Started

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

2. Verify environment variables, these will be set up by the `npx create-onchain --mini` command:

You can regenerate the FARCASTER Account Association environment variables by running `npx create-onchain --manifest` in your project directory.

The environment variables enable the following features:

- Frame metadata - Sets up the Frame Embed that will be shown when you cast your frame
- Account association - Allows users to add your frame to their account, enables notifications
- Redis API keys - Enable Webhooks and background notifications for your application by storing users notification details

```bash
# Shared/OnchainKit variables
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=
NEXT_PUBLIC_URL=
NEXT_PUBLIC_ICON_URL=
NEXT_PUBLIC_ONCHAINKIT_API_KEY=

# Frame metadata
FARCASTER_HEADER=
FARCASTER_PAYLOAD=
FARCASTER_SIGNATURE=
NEXT_PUBLIC_APP_ICON=
NEXT_PUBLIC_APP_SUBTITLE=
NEXT_PUBLIC_APP_DESCRIPTION=
NEXT_PUBLIC_APP_SPLASH_IMAGE=
NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR=
NEXT_PUBLIC_APP_PRIMARY_CATEGORY=
NEXT_PUBLIC_APP_HERO_IMAGE=
NEXT_PUBLIC_APP_TAGLINE=
NEXT_PUBLIC_APP_OG_TITLE=
NEXT_PUBLIC_APP_OG_DESCRIPTION=
NEXT_PUBLIC_APP_OG_IMAGE=

# Redis config
REDIS_URL=
REDIS_TOKEN=

# Gambling Contract Configuration
NEXT_PUBLIC_ERC20_CONTRACT_ADDRESS=0xbb97f8257cd4ba47ae5c979afcf12eb19d1723e8
NEXT_PUBLIC_GAMBLING_CONTRACT_ADDRESS=0x7d0CF0F993568c38061942f8Eaaa3B2ec084441B
NEXT_PUBLIC_CLAIM_CONTRACT_ADDRESS=your_claim_contract_address_here

# Private key of the gambling contract owner (without 0x prefix)
# This is used to automatically call gamblyWin function when users win
# ⚠️ Never share or commit your PRIVATE_KEY!
PRIVATE_KEY=your_private_key_here_without_0x_prefix
```

3. Start the development server:
```bash
npm run dev
```

## Template Features

### Frame Configuration
- `.well-known/farcaster.json` endpoint configured for Frame metadata and account association
- Frame metadata automatically added to page headers in `layout.tsx`

### Background Notifications
- Redis-backed notification system using Upstash
- Ready-to-use notification endpoints in `api/notify` and `api/webhook`
- Notification client utilities in `lib/notification-client.ts`

### Theming
- Custom theme defined in `theme.css` with OnchainKit variables
- Pixel font integration with Pixelify Sans
- Dark/light mode support through OnchainKit

### MiniKit Provider
The app is wrapped with `MiniKitProvider` in `providers.tsx`, configured with:
- OnchainKit integration
- Access to Frames context
- Sets up Wagmi Connectors
- Sets up Frame SDK listeners
- Applies Safe Area Insets

## Gambling Features

### Automatic Win Claiming
When a user wins the gamble (random number modulo win difficulty equals 0), the system automatically:
1. Calls the `gamblyWin` function as the contract owner using the PRIVATE_KEY
2. Passes the user's wallet address as the recipient parameter
3. Shows a success notification with the claim transaction hash
4. No manual claim button is shown - the process is fully automated

### Welcome Bonus Claiming
New users can claim a welcome bonus of tokens:
1. The system checks if the user has already claimed using the `claimed` mapping in the claim contract
2. If not claimed, displays a claim button with the amount from `CLAIM_AMOUNT`
3. Users can claim once per wallet address
4. The claim amount is dynamically read from the contract and formatted for display

### Environment Setup
Make sure to set up your `.env` file with the required variables:
- `PRIVATE_KEY`: The private key of the contract owner (without 0x prefix)
- `NEXT_PUBLIC_ERC20_CONTRACT_ADDRESS`: The ERC20 token contract address
- `NEXT_PUBLIC_GAMBLING_CONTRACT_ADDRESS`: The gambling contract address

## Customization

To get started building your own frame, follow these steps:

1. Remove the DemoComponents:
   - Delete `components/DemoComponents.tsx`
   - Remove demo-related imports from `page.tsx`

2. Start building your Frame:
   - Modify `page.tsx` to create your Frame UI
   - Update theme variables in `theme.css`
   - Adjust MiniKit configuration in `providers.tsx`

3. Add your frame to your account:
   - Cast your frame to see it in action
   - Share your frame with others to start building your community

## Learn More

- [MiniKit Documentation](https://docs.base.org/builderkits/minikit/overview)
- [OnchainKit Documentation](https://docs.base.org/builderkits/onchainkit/getting-started)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
