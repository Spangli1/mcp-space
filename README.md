# MCP Space 🚀

![MCP Space](https://img.shields.io/badge/MCP_Space-Open%20Source-brightgreen)

Welcome to **MCP Space**, a no-code platform designed to help you build and deploy AI tools effortlessly using the Model Context Protocol (MCP). With MCP Space, you can create powerful AI agents through an intuitive chat interface, all without writing a single line of code. Once you have your AI agent ready, deploy it with just one click to Cloudflare Workers. This repository combines a Next.js frontend with a Google ADK backend to provide a seamless AI development experience.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Usage](#usage)
- [Deployment](#deployment)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [License](#license)
- [Releases](#releases)
- [Contact](#contact)

## Features

- **No-Code Development**: Build AI tools without writing code.
- **Intuitive Interface**: Use a chat interface to create and manage AI agents.
- **One-Click Deployment**: Deploy your AI tools easily to Cloudflare Workers.
- **Seamless Integration**: Combines Next.js and Google ADK for a smooth experience.
- **Robust Backend**: Utilizes Supabase for authentication and data management.

## Getting Started

To get started with MCP Space, follow these simple steps:

1. **Clone the Repository**: Use the following command to clone the repository to your local machine.

   ```bash
   git clone https://github.com/Spangli1/mcp-space.git
   ```

2. **Navigate to the Directory**: Change into the project directory.

   ```bash
   cd mcp-space
   ```

3. **Install Dependencies**: Install the required packages.

   ```bash
   npm install
   ```

## Installation

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (version 14 or higher)
- npm (Node Package Manager)
- Access to a Cloudflare account for deployment

### Step-by-Step Installation

1. **Clone the Repository**: Use the command provided above.
2. **Install Dependencies**: Run `npm install` to set up the project.
3. **Environment Variables**: Create a `.env` file in the root directory and add your Cloudflare API keys and other necessary configurations.

   ```plaintext
   CLOUDFLARE_API_KEY=your_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

4. **Start the Development Server**: Run the following command to start the local development server.

   ```bash
   npm run dev
   ```

## Usage

Once you have installed the project, you can start using MCP Space to create AI tools.

1. **Access the Application**: Open your web browser and go to `http://localhost:3000`.
2. **Create an AI Agent**: Use the chat interface to define your AI agent’s behavior and capabilities.
3. **Test Your Agent**: Interact with your AI agent through the interface to ensure it meets your requirements.

## Deployment

After you have created your AI agent, deploying it to Cloudflare Workers is straightforward.

1. **Build the Project**: First, build the project for production.

   ```bash
   npm run build
   ```

2. **Deploy to Cloudflare**: Use the following command to deploy your project.

   ```bash
   npm run deploy
   ```

3. **Visit Your Deployed Agent**: After deployment, you can visit your AI agent at the URL provided by Cloudflare.

## Technologies Used

MCP Space utilizes a variety of technologies to provide a robust platform:

- **Next.js**: A React framework for building server-side rendered applications.
- **Google ADK**: Provides backend services for data management and authentication.
- **Supabase**: An open-source Firebase alternative for database and authentication.
- **Cloudflare Workers**: For serverless deployment of your AI tools.
- **TypeScript**: For type-safe coding and improved developer experience.

## Contributing

We welcome contributions to MCP Space! If you want to contribute, please follow these steps:

1. **Fork the Repository**: Click on the "Fork" button at the top right of the page.
2. **Create a Branch**: Create a new branch for your feature or bug fix.

   ```bash
   git checkout -b feature/YourFeatureName
   ```

3. **Make Changes**: Implement your changes and commit them.

   ```bash
   git commit -m "Add your message here"
   ```

4. **Push Changes**: Push your changes to your forked repository.

   ```bash
   git push origin feature/YourFeatureName
   ```

5. **Create a Pull Request**: Go to the original repository and click on "New Pull Request."

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Releases

You can find the latest releases of MCP Space [here](https://github.com/Spangli1/mcp-space/releases). Download the latest version and execute it to get started.

If you have any issues or need further information, please check the "Releases" section for updates.

## Contact

For questions or support, feel free to reach out:

- **GitHub**: [Spangli1](https://github.com/Spangli1)
- **Email**: support@example.com

Thank you for checking out MCP Space! We look forward to seeing what you build with our platform.