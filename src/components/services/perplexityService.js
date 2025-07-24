// services/perplexityService.js
class PerplexityService {
  constructor() {
    this.apiKey = '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';
    this.baseUrl = 'https://api.perplexity.ai/chat/completions';
  }

  async generateInsights(data, context) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [
            {
              role: 'system',
              content: 'You are a business intelligence expert specializing in e-commerce analytics. Provide actionable insights based on the provided data.'
            },
            {
              role: 'user',
              content: this.buildPrompt(data, context)
            }
          ],
          max_tokens: 1000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      return this.parseInsights(result.choices[0].message.content);
    } catch (error) {
      console.error('Perplexity API Error:', error);
      throw error;
    }
  }

  buildPrompt(data, context) {
    const { reportType, totalSales, totalOrders, topSkus, platformData } = data;
    
    return `
Analyze this ${reportType} data for Bani Women Multi-Platform Ecommerce:

PERFORMANCE METRICS:
- Total Sales: ₹${totalSales?.toLocaleString() || 0}
- Total Orders: ${totalOrders?.toLocaleString() || 0}
- Average Order Value: ₹${totalOrders ? (totalSales/totalOrders).toFixed(2) : 0}

TOP PERFORMING SKUS:
${topSkus?.slice(0, 5).map((sku, i) => 
  `${i+1}. ${sku.parentSku}: ₹${sku.totalValue.toLocaleString()} (${sku.childSkus.size} variants)`
).join('\n') || 'No SKU data available'}

PLATFORM BREAKDOWN:
${Object.entries(platformData || {}).map(([platform, data]) => 
  `- ${platform}: ₹${data.sales?.toLocaleString() || 0} sales`
).join('\n') || 'No platform data available'}

CONTEXT: ${context}

Please provide:
1. 3 key insights about current performance
2. 3 specific growth opportunities with expected ROI
3. 2 risk factors to monitor
4. 1 strategic recommendation for next quarter

Format as JSON with categories: insights, opportunities, risks, strategy.
    `;
  }

  parseInsights(content) {
    try {
      // Try to parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: parse structured text
      return this.parseStructuredText(content);
    } catch (error) {
      return this.parseStructuredText(content);
    }
  }

  parseStructuredText(content) {
    const sections = {
      insights: [],
      opportunities: [],
      risks: [],
      strategy: []
    };

    const lines = content.split('\n');
    let currentSection = null;

    lines.forEach(line => {
      line = line.trim();
      if (line.toLowerCase().includes('insight')) currentSection = 'insights';
      else if (line.toLowerCase().includes('opportunit')) currentSection = 'opportunities';
      else if (line.toLowerCase().includes('risk')) currentSection = 'risks';
      else if (line.toLowerCase().includes('strateg')) currentSection = 'strategy';
      else if (line.match(/^\d+\./) && currentSection) {
        sections[currentSection].push(line.replace(/^\d+\.\s*/, ''));
      }
    });

    return sections;
  }
}

export const perplexityService = new PerplexityService();
