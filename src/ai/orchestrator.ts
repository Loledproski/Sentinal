import { GoogleGenAI, Type } from '@google/genai';

/**
 * AI Tool Orchestrator
 * (File designed for your friend to customize and train tool mappings)
 */
export const sentinelToolDeclarations = [
  {
    name: 'scanStorage',
    description: 'Scans the drive for large files, temp caches, and duplicate files.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  },
  {
    name: 'cleanStorage',
    description: 'Frees up disk space by deleting temporary files and system caches.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        confirm: { type: Type.BOOLEAN, description: 'Explicit confirmation from user to purge temp files.' }
      },
      required: ['confirm']
    }
  },
  {
    name: 'checkNetworkSecurity',
    description: 'Audits Wi-Fi encryption, DNS leak status, and firewall integrity.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'getProcessThreats',
    description: 'Scans running desktop processes for malware, high memory leaks, and suspicious tasks.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'launchApp',
    description: 'Opens an application (e.g. Chrome, VS Code, Calculator) or runs a search.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING, description: 'Application name to launch' },
        query: { type: Type.STRING, description: 'Optional query if searching or navigating' }
      },
      required: ['appName']
    }
  },
  {
    name: 'getSystemOverview',
    description: 'Gets current CPU, GPU, RAM, and battery performance numbers.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  }
];

export interface OrchestrationResult {
  tool: string | null;
  args?: Record<string, any>;
  explanation: string;
  requiresConfirmation?: boolean;
}

/**
 * Client-friendly router: evaluates natural language and maps to a structured Sentinel tool.
 */
export async function routeUserCommand(input: string): Promise<OrchestrationResult> {
  const normalized = input.toLowerCase();

  // Fast offline intent matchers (guarantees instant responsiveness even without API keys)
  if (normalized.includes('scan') && (normalized.includes('storage') || normalized.includes('disk') || normalized.includes('file') || normalized.includes('space'))) {
    return {
      tool: 'scanStorage',
      explanation: 'Initiating deep disk scan across system drive...',
    };
  }

  if (normalized.includes('clean') || normalized.includes('free up') || normalized.includes('boost') || normalized.includes('clear temp')) {
    return {
      tool: 'cleanStorage',
      args: { confirm: true },
      explanation: 'Purging temporary files, shader cache, and old installers.',
      requiresConfirmation: true
    };
  }

  if (normalized.includes('network') || normalized.includes('wifi') || normalized.includes('wi-fi') || normalized.includes('safe') || normalized.includes('firewall')) {
    return {
      tool: 'checkNetworkSecurity',
      explanation: 'Running network encryption audit and checking Wi-Fi integrity...',
    };
  }

  if (normalized.includes('threat') || normalized.includes('virus') || normalized.includes('process') || normalized.includes('malware') || normalized.includes('suspicious')) {
    return {
      tool: 'getProcessThreats',
      explanation: 'Analyzing active background processes and checking threat indicators...',
    };
  }

  if (normalized.includes('open') || normalized.includes('launch') || normalized.includes('start')) {
    const appMatch = normalized.replace(/(open|launch|start)\s+/i, '').trim();
    return {
      tool: 'launchApp',
      args: { appName: appMatch || 'application' },
      explanation: `Executing system process: Launching ${appMatch || 'application'}...`,
    };
  }

  if (normalized.includes('status') || normalized.includes('performance') || normalized.includes('cpu') || normalized.includes('ram') || normalized.includes('insights')) {
    return {
      tool: 'getSystemOverview',
      explanation: 'Gathering live hardware telemetry (CPU, RAM, GPU, Battery)...',
    };
  }

  // Fallback response for conversational questions
  return {
    tool: null,
    explanation: `Sentinel command received: "${input}". Awaiting operational directive.`
  };
}
