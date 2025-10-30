# 10x-Physio

A web application designed to optimize the work of physiotherapists by automating the process of creating recommendations and home exercises for patients.

## Table of Contents
- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

10x-Physio is a web application designed to streamline the workflow of physiotherapists. The core feature is the automation of generating post-visit recommendations and home exercises for patients. By leveraging Artificial Intelligence (AI), the application analyzes the physiotherapist's description of a visit and generates personalized suggestions. These suggestions can then be easily edited and approved by the therapist.

The main problem this project addresses is the significant amount of time physiotherapists spend manually preparing repetitive and often generic therapeutic plans, which is an inefficient and error-prone process. 10x-Physio aims to give back valuable time to therapists, allowing them to focus more on patient care and professional development.

## Tech Stack

### Frontend
- **Vite 7**: For lightning-fast development server and Hot Module Replacement (HMR).
- **React 19**: For building a modern and interactive user interface.
- **TypeScript 5**: For static typing, enhancing code quality and maintainability.
- **Tailwind 4**: For utility-first CSS styling directly in the markup.
- **FluentUI 2**: For a library of consistent and accessible UI components.

### Backend
- **.NET 8**: A modern, high-performance, cross-platform framework.
- **ASP.NET Core**: For building scalable and secure web applications and APIs.

### Database
- **Supabase**: Provides a managed **PostgreSQL** database, built-in user authentication, and auto-generated APIs.

### Artificial Intelligence
- **Openrouter.ai**: Acts as a gateway to access a wide range of AI models (from OpenAI, Anthropic, Google, etc.), enabling flexibility and cost optimization.

### CI/CD & Hosting
- **GitHub Actions**: For automating the build, test, and deployment pipelines.
- **Azure**: As a scalable cloud platform for hosting the .NET and React applications.

## Getting Started Locally

To set up and run this project on your local machine, follow these steps.

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (includes npm)
- A code editor like [Visual Studio](https://visualstudio.microsoft.com/) or [VS Code](https://code.visualstudio.com/)

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/mateusz-rytwinski-euvic/10x-devs-project.git
    cd 10x-devs-project
    ```

2.  **Set up the backend (.NET):**
    - Open the `10xPhysio.sln` file in Visual Studio.
    - Build the solution to restore NuGet packages.
    - The backend is configured to run on `https://localhost:7030` and `http://localhost:5138` by default (see `Properties/launchSettings.json`).

3.  **Set up the frontend (React + Vite):**
    - Navigate to the client app directory:
      ```sh
      cd 10xphysio.client
      ```
    - Install npm packages:
      ```sh
      npm install
      ```

### Supabase configuration

The backend expects Supabase credentials to be available at startup. The configuration is bound to the `Supabase` section in `appsettings.json` and validated eagerly. For local development, store the secrets with the .NET user-secrets store so they are not committed to source control:

```sh
dotnet user-secrets set "Supabase:Url" "https://your-project.supabase.co"
dotnet user-secrets set "Supabase:AnonKey" "your-anon-key"
dotnet user-secrets set "Supabase:ServiceRoleKey" "optional-service-role-key"
```

Services can request the `ISupabaseClientFactory` interface via dependency injection to obtain an initialized `Supabase.Client` instance when needed.

### Running the Application

You can run both the frontend and backend concurrently using Visual Studio's multi-project startup configuration, which is the default for this solution.

1.  Open `10xPhysio.sln` in Visual Studio.
2.  Press `F5` or click the "Start" button.

This will:
- Launch the ASP.NET Core backend.
- Launch the Vite development server for the React frontend.
- Open a browser window to `https://localhost:54501`, with the backend acting as a proxy for the frontend.

Alternatively, you can run them in separate terminals:
- **Backend:** Run `dotnet run` from the `10xPhysio.Server` directory.
- **Frontend:** Run `npm run dev` from the `10xphysio.client` directory.

## Available Scripts

In the `10xphysio.client` directory, you can run the following scripts:

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Compiles TypeScript and builds the production-ready application.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run preview`: Serves the production build locally for previewing.

## Project Scope

### MVP Features (In Scope)
- **User Authentication**: Secure registration and login for physiotherapists.
- **Patient Management (CRUD)**: Add, view, edit, and delete patient records.
- **Visit Management (CRUD)**: Document patient visits with detailed descriptions.
- **AI-Powered Recommendations**: Automatically generate exercise and care suggestions based on visit notes.
- **Editable Suggestions**: Therapists can review, edit, and approve all AI-generated content.
- **Patient History**: A consolidated view of all past visits and recommendations for each patient.

### Out of Scope for MVP
- Advanced analytics and patient progress reporting.
- Integrations with external systems (e.g., calendars).
- Advanced role-based access control (e.g., receptionists, admins).
- A dedicated mobile application for patients or therapists.
- Automated SMS/email notifications.
- Billing and invoicing modules.

## Project Status

**In Development**

This project is currently in the initial development phase. The focus is on building the core functionalities defined for the Minimum Viable Product (MVP).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
