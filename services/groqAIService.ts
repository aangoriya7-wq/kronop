// ==================== GROQ AI SERVICE ====================
// AI-powered support chat using Groq API

const GROQ_API_URL = process.env.EXPO_PUBLIC_GROQ_API_URL || process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';

// Load app knowledge from JSON file
let appKnowledge: any = null;
try {
  const fs = require('fs');
  const path = require('path');
  const knowledgePath = path.join(__dirname, 'appKnowledge.json');
  if (fs.existsSync(knowledgePath)) {
    appKnowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
  }
} catch (error) {
  console.warn('⚠️ Could not load app knowledge file:', error);
}

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqResponse {
  choices: {
    message: {
      content: string;
      role: string;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class GroqAIService {
  private apiKey: string;
  private model: string = 'llama-3.3-70b-versatile'; // Using current Llama 3.3 70B model

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ Groq API key not found in configuration');
    }
  }

  /**
   * Send message to Groq AI and get response
   */
  async sendMessage(messages: GroqMessage[]): Promise<string> {
    try {
      if (!this.apiKey) {
        console.warn('⚠️ Groq API key not configured - using fallback mode');
        return this.getFallbackResponse();
      }

      // Add system prompt with app knowledge and Kronop branding
      const knowledgeContext = appKnowledge ? 
        `\n\nAPP KNOWLEDGE:\n${JSON.stringify(appKnowledge, null, 2)}` : '';
        
      const systemMessage: GroqMessage = {
        role: 'system',
        content: `You are a helpful AI assistant for Kronop, a social media platform. You should:

1. Be friendly, professional, and helpful
2. Use the provided app knowledge to answer questions accurately
3. Help users with content uploads, profile management, and app usage
4. Keep responses concise but informative
5. Use emojis occasionally to make conversations more engaging
6. Respond in the language the user is using (Hindi, English, etc.)
7. ALWAYS base your answers on the app knowledge provided above
8. If information is not in the knowledge, suggest checking the app or contacting support

${knowledgeContext}

IMPORTANT: Use only the information from the app knowledge above. Do not make up information about features, endpoints, or configurations that are not mentioned in the knowledge.`
      };

      const requestMessages = [systemMessage, ...messages];

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: requestMessages,
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`⚠️ Groq API ${response.status}:`, errorData);
        
        if (response.status === 401) {
          return this.getAuthErrorResponse();
        }
        
        throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data: GroqResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Groq AI');
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('❌ Groq AI Error:', error);
      
      // Fallback response for API errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        return this.getAuthErrorResponse();
      }
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return '🌐 Network issue detected. Please check your internet connection and try again.';
      }
      
      return '🤖 I apologize, but I\'m having trouble connecting right now. Please try again or contact our support team at 9039012335.';
    }
  }

  /**
   * Get fallback response when API is not available
   */
  private getFallbackResponse(): string {
    return '🤖 Hi! I\'m currently in maintenance mode. For immediate assistance:\n\n📞 Call: 9039012335\n📧 Email: angoriyaarun311@gmail.com\n\nI can help you with:\n• Profile updates\n• Video uploads\n• Settings configuration\n• Account issues\n\nPlease describe your issue and I\'ll guide you through the solution!';
  }

  /**
   * Get authentication error response
   */
  private getAuthErrorResponse(): string {
    return '🔐 AI service authentication required. Our team is working on this!\n\nFor immediate help:\n📞 Call: 9039012335\n📧 Email: angoriyaarun311@gmail.com\n\nI apologize for the inconvenience. Please try again in a few minutes.';
  }

  /**
   * Get a quick response for common questions using app knowledge
   */
  async getQuickResponse(question: string): Promise<string> {
    // Try to answer using app knowledge first
    if (appKnowledge) {
      const lowerQuestion = question.toLowerCase();
      
      // Check for content type questions
      if (lowerQuestion.includes('reel') || lowerQuestion.includes('reels')) {
        const reelInfo = appKnowledge.features?.contentTypes?.find((c: any) => c.type === 'Reels');
        if (reelInfo) {
          return `🎬 **Reels**: ${reelInfo.description}\n\n📤 Upload: ${reelInfo.upload}\n💾 Storage: ${reelInfo.storage}\n\nNeed help uploading? Ask me "How to upload reels?"`;
        }
      }
      
      if (lowerQuestion.includes('video') || lowerQuestion.includes('videos')) {
        const videoInfo = appKnowledge.features?.contentTypes?.find((c: any) => c.type === 'Videos');
        if (videoInfo) {
          return `🎥 **Videos**: ${videoInfo.description}\n\n📤 Upload: ${videoInfo.upload}\n💾 Storage: ${videoInfo.storage}\n\nNeed help uploading? Ask me "How to upload videos?"`;
        }
      }
      
      if (lowerQuestion.includes('photo') || lowerQuestion.includes('photos')) {
        const photoInfo = appKnowledge.features?.contentTypes?.find((c: any) => c.type === 'Photos');
        if (photoInfo) {
          return `📸 **Photos**: ${photoInfo.description}\n\n📤 Upload: ${photoInfo.upload}\n💾 Storage: ${photoInfo.storage}\n\nNeed help uploading? Ask me "How to upload photos?"`;
        }
      }
      
      // Check for troubleshooting
      if (lowerQuestion.includes('error') || lowerQuestion.includes('problem') || lowerQuestion.includes('issue')) {
        const issues = appKnowledge.troubleshooting?.commonIssues;
        if (issues && issues.length > 0) {
          const issueList = issues.map((issue: any) => `• **${issue.issue}**: ${issue.solution}`).join('\n');
          return `🔧 **Common Issues & Solutions**:\n\n${issueList}\n\nStill having trouble? Contact support!`;
        }
      }
      
      // Check for API/technical questions
      if (lowerQuestion.includes('api') || lowerQuestion.includes('endpoint') || lowerQuestion.includes('server')) {
        const apiInfo = appKnowledge.features?.apiEndpoints;
        if (apiInfo) {
          return `🔗 **API Information**:\n\n• Base URL: ${apiInfo.baseURL}\n• Content: ${apiInfo.content}\n• Upload: ${apiInfo.upload}\n• Health: ${apiInfo.health}\n\nNeed help with API integration? Ask me specific questions!`;
        }
      }
    }

    // Fallback to AI if no knowledge-based response
    return this.sendMessage([{ role: 'user', content: question }]);
  }

  /**
   * Check if API is configured and working
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.apiKey) return false;
      
      const testResponse = await this.sendMessage([
        { role: 'user', content: 'Hello, can you respond with just "OK"?' }
      ]);
      
      return testResponse.includes('OK');
    } catch (error) {
      console.error('Groq health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const groqAI = new GroqAIService();
export default groqAI;
