import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function FeatureRecommendations({ 
  userPersona, 
  userBehavior = {}, 
  onFeaturePress 
}) {
  const { theme } = useTheme();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateRecommendations();
  }, [userPersona, userBehavior]);

  const generateRecommendations = async () => {
    setLoading(true);
    
    // Simulate AI-powered recommendations based on persona and behavior
    const mockRecommendations = getPersonaRecommendations(userPersona, userBehavior);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setRecommendations(mockRecommendations);
    setLoading(false);
  };

  const getPersonaRecommendations = (persona, behavior) => {
    if (!persona) return [];

    const baseRecommendations = {
      promoter: [
        {
          id: '1',
          title: 'Social Media Analytics',
          description: 'Track engagement across all platforms',
          icon: 'analytics',
          priority: 'high',
          reason: 'Based on your event promotion activity',
          category: 'analytics',
        },
        {
          id: '2',
          title: 'Automated Posting',
          description: 'Schedule posts across multiple platforms',
          icon: 'time',
          priority: 'medium',
          reason: 'Save time on social media management',
          category: 'automation',
        },
        {
          id: '3',
          title: 'Audience Insights',
          description: 'Understand your event attendees better',
          icon: 'people',
          priority: 'high',
          reason: 'Improve targeting for future events',
          category: 'insights',
        },
      ],
      coordinator: [
        {
          id: '1',
          title: 'Vendor Management System',
          description: 'Centralize all vendor communications',
          icon: 'business',
          priority: 'high',
          reason: 'Streamline your coordination workflow',
          category: 'management',
        },
        {
          id: '2',
          title: 'Timeline Templates',
          description: 'Pre-built timelines for common events',
          icon: 'list',
          priority: 'medium',
          reason: 'Speed up event planning process',
          category: 'templates',
        },
        {
          id: '3',
          title: 'Budget Tracker',
          description: 'Real-time budget monitoring',
          icon: 'card',
          priority: 'high',
          reason: 'Keep events within budget',
          category: 'finance',
        },
      ],
      wedding_planner: [
        {
          id: '1',
          title: 'Design Board Creator',
          description: 'Visual mood boards for couples',
          icon: 'color-palette',
          priority: 'high',
          reason: 'Help couples visualize their vision',
          category: 'design',
        },
        {
          id: '2',
          title: 'Vendor Portfolio',
          description: 'Curated vendor recommendations',
          icon: 'images',
          priority: 'medium',
          reason: 'Build trust with quality vendors',
          category: 'portfolio',
        },
        {
          id: '3',
          title: 'Timeline Builder',
          description: 'Detailed wedding day schedules',
          icon: 'time',
          priority: 'high',
          reason: 'Ensure smooth wedding execution',
          category: 'planning',
        },
      ],
      venue_owner: [
        {
          id: '1',
          title: 'Dynamic Pricing',
          description: 'Optimize pricing based on demand',
          icon: 'trending-up',
          priority: 'high',
          reason: 'Maximize venue revenue potential',
          category: 'pricing',
        },
        {
          id: '2',
          title: 'Booking Analytics',
          description: 'Understand booking patterns',
          icon: 'bar-chart',
          priority: 'medium',
          reason: 'Make data-driven decisions',
          category: 'analytics',
        },
        {
          id: '3',
          title: 'Client Portal',
          description: 'Self-service booking management',
          icon: 'people',
          priority: 'high',
          reason: 'Reduce administrative overhead',
          category: 'automation',
        },
      ],
      performer: [
        {
          id: '1',
          title: 'Portfolio Showcase',
          description: 'Professional performance gallery',
          icon: 'camera',
          priority: 'high',
          reason: 'Attract more booking opportunities',
          category: 'marketing',
        },
        {
          id: '2',
          title: 'Availability Calendar',
          description: 'Sync with booking platforms',
          icon: 'calendar',
          priority: 'medium',
          reason: 'Prevent double bookings',
          category: 'scheduling',
        },
        {
          id: '3',
          title: 'Performance Analytics',
          description: 'Track earnings and performance data',
          icon: 'analytics',
          priority: 'high',
          reason: 'Optimize your performance business',
          category: 'analytics',
        },
      ],
      vendor: [
        {
          id: '1',
          title: 'Quote Generator',
          description: 'Professional quote templates',
          icon: 'document-text',
          priority: 'high',
          reason: 'Speed up client proposals',
          category: 'automation',
        },
        {
          id: '2',
          title: 'Service Catalog',
          description: 'Detailed service listings',
          icon: 'list',
          priority: 'medium',
          reason: 'Showcase your full offering',
          category: 'marketing',
        },
        {
          id: '3',
          title: 'Client Reviews',
          description: 'Collect and display testimonials',
          icon: 'star',
          priority: 'high',
          reason: 'Build credibility and trust',
          category: 'reputation',
        },
      ],
    };

    // Get base recommendations for persona
    let personaRecs = baseRecommendations[persona.id] || baseRecommendations.promoter;

    // Apply behavior-based filtering and prioritization
    if (behavior.frequentFeatures) {
      // Boost recommendations for features user uses frequently
      personaRecs = personaRecs.map(rec => ({
        ...rec,
        priority: behavior.frequentFeatures.includes(rec.category) ? 'high' : rec.priority,
        reason: behavior.frequentFeatures.includes(rec.category) 
          ? `You frequently use ${rec.category} features` 
          : rec.reason
      }));
    }

    if (behavior.underutilizedFeatures) {
      // Add recommendations for underutilized features
      const underutilizedRecs = personaRecs.filter(rec => 
        behavior.underutilizedFeatures.includes(rec.category)
      ).map(rec => ({
        ...rec,
        priority: 'high',
        reason: `You haven't tried ${rec.category} features yet`
      }));
      
      personaRecs = [...underutilizedRecs, ...personaRecs.filter(rec => 
        !behavior.underutilizedFeatures.includes(rec.category)
      )];
    }

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    personaRecs.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    return personaRecs.slice(0, 3); // Return top 3 recommendations
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#E74C3C';
      case 'medium': return '#F39C12';
      case 'low': return '#95A5A6';
      default: return '#95A5A6';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return 'High Priority';
      case 'medium': return 'Medium Priority';
      case 'low': return 'Low Priority';
      default: return 'Recommended';
    }
  };

  const renderRecommendation = ({ item }) => (
    <TouchableOpacity
      style={[styles.recommendationCard, { backgroundColor: theme.cardBackground }]}
      onPress={() => onFeaturePress?.(item)}
    >
      <View style={styles.recommendationHeader}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name={item.icon} size={24} color={theme.primary} />
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {getPriorityText(item.priority)}
          </Text>
        </View>
      </View>
      
      <Text style={[styles.recommendationTitle, { color: theme.text }]}>
        {item.title}
      </Text>
      
      <Text style={[styles.recommendationDescription, { color: theme.subtext }]}>
        {item.description}
      </Text>
      
      <Text style={[styles.recommendationReason, { color: theme.primary }]}>
        {item.reason}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>AI Recommendations</Text>
        <View style={styles.loadingContainer}>
          <Ionicons name="analytics" size={32} color={theme.subtext} />
          <Text style={[styles.loadingText, { color: theme.subtext }]}>
            Analyzing your usage patterns...
          </Text>
        </View>
      </View>
    );
  }

  if (recommendations.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>AI Recommendations</Text>
        <View style={styles.emptyContainer}>
          <Ionicons name="bulb" size={32} color={theme.subtext} />
          <Text style={[styles.emptyText, { color: theme.subtext }]}>
            No recommendations available yet
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>AI Recommendations</Text>
        <TouchableOpacity onPress={generateRecommendations}>
          <Ionicons name="refresh" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={recommendations}
        renderItem={renderRecommendation}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recommendationsList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  recommendationsList: {
    paddingHorizontal: 4,
  },
  recommendationCard: {
    width: width * 0.8,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  recommendationDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  recommendationReason: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
