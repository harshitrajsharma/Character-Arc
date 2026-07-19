// Historical GATE CSE cutoff data (2019-2023)
const GATE_CUTOFFS = {
  // Score ranges for different rank brackets (based on normalized marks)
  RANKS: {
    TOP_100: { min: 74.3, typical: 78.5 },    // Ranks 1-100
    TOP_500: { min: 65.2, typical: 69.8 },    // Ranks 101-500
    TOP_1000: { min: 58.7, typical: 62.4 },   // Ranks 501-1000
    TOP_2000: { min: 52.1, typical: 55.9 },   // Ranks 1001-2000
    TOP_5000: { min: 45.3, typical: 48.7 },   // Ranks 2001-5000
  },
  
  // Percentile to score mapping (approximate)
  PERCENTILES: {
    99.99: 82.5, // Top 0.01%
    99.9: 75.2,  // Top 0.1%
    99.5: 68.4,  // Top 0.5%
    99.0: 63.7,  // Top 1%
    98.0: 58.2,  // Top 2%
    95.0: 51.4,  // Top 5%
    90.0: 43.8,  // Top 10%
  }
}

interface RankPrediction {
  minRank: number
  maxRank: number
  percentile: number
  confidence: 'high' | 'medium' | 'low'
  qualifyingScore: boolean
}

export function predictGateRank(normalizedScore: number): RankPrediction {
  // Default values
  let minRank = 10000
  let maxRank = 15000
  let percentile = 85.0
  let confidence: 'high' | 'medium' | 'low' = 'medium'
  let qualifyingScore = false

  // Calculate rank range based on score
  if (normalizedScore >= GATE_CUTOFFS.RANKS.TOP_100.min) {
    minRank = 1
    maxRank = normalizedScore >= GATE_CUTOFFS.RANKS.TOP_100.typical ? 50 : 100
    confidence = 'high'
    qualifyingScore = true
  } else if (normalizedScore >= GATE_CUTOFFS.RANKS.TOP_500.min) {
    minRank = 101
    maxRank = 500
    confidence = 'high'
    qualifyingScore = true
  } else if (normalizedScore >= GATE_CUTOFFS.RANKS.TOP_1000.min) {
    minRank = 501
    maxRank = 1000
    confidence = 'high'
    qualifyingScore = true
  } else if (normalizedScore >= GATE_CUTOFFS.RANKS.TOP_2000.min) {
    minRank = 1001
    maxRank = 2000
    confidence = 'medium'
    qualifyingScore = true
  } else if (normalizedScore >= GATE_CUTOFFS.RANKS.TOP_5000.min) {
    minRank = 2001
    maxRank = 5000
    confidence = 'medium'
    qualifyingScore = true
  }

  // Calculate percentile
  for (const [percentileStr, score] of Object.entries(GATE_CUTOFFS.PERCENTILES)) {
    if (normalizedScore >= score) {
      percentile = parseFloat(percentileStr)
      break
    }
  }

  // Adjust confidence based on score volatility
  if (normalizedScore > 80) {
    confidence = 'low' // High scores have more volatility
  } else if (normalizedScore < 30) {
    confidence = 'low' // Low scores have more volatility
  }

  return {
    minRank,
    maxRank,
    percentile,
    confidence,
    qualifyingScore
  }
}

export function getScoreInsights(normalizedScore: number) {
  const insights = []

  // College admission insights
  if (normalizedScore >= GATE_CUTOFFS.RANKS.TOP_100.min) {
    insights.push("Potential for admission to top IITs")
  } else if (normalizedScore >= GATE_CUTOFFS.RANKS.TOP_500.min) {
    insights.push("Good chances for IITs/NITs")
  } else if (normalizedScore >= GATE_CUTOFFS.RANKS.TOP_2000.min) {
    insights.push("Possibilities for NITs and other institutes")
  }

  // PSU insights
  if (normalizedScore >= 55) {
    insights.push("Eligible for most PSU cutoffs")
  } else if (normalizedScore >= 45) {
    insights.push("Eligible for some PSU cutoffs")
  }

  // General insights
  if (normalizedScore >= GATE_CUTOFFS.PERCENTILES[99.0]) {
    insights.push("Exceptional performance - in top 1%")
  } else if (normalizedScore >= GATE_CUTOFFS.PERCENTILES[95.0]) {
    insights.push("Very good performance - in top 5%")
  }

  return insights
}

export function getImprovementSuggestions(normalizedScore: number, targetScore: number) {
  const suggestions = []
  const gap = targetScore - normalizedScore

  if (gap <= 0) {
    suggestions.push("You're on track! Focus on maintaining consistency")
    return suggestions
  }

  // Score-based suggestions
  if (gap > 20) {
    suggestions.push("Focus on fundamental concepts across all subjects")
    suggestions.push("Increase daily study hours significantly")
    suggestions.push("Take more full-length mock tests")
  } else if (gap > 10) {
    suggestions.push("Practice more previous year questions")
    suggestions.push("Focus on high-weightage topics")
    suggestions.push("Improve test-taking strategy")
  } else {
    suggestions.push("Fine-tune your problem-solving speed")
    suggestions.push("Focus on accuracy in calculations")
    suggestions.push("Review your weak areas")
  }

  // Topic-based suggestions
  if (normalizedScore < 45) {
    suggestions.push("Strengthen core CS subjects: OS, DBMS, CN")
  } else if (normalizedScore < 60) {
    suggestions.push("Focus on advanced topics and problem-solving")
  } else {
    suggestions.push("Practice complex and linked questions")
  }

  return suggestions
} 
