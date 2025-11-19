/**
 * Bar Category Selection Screen
 * Shows 3 main categories: Mixed Drinks, Spirits, Beer
 * Square/DoorDash style category selection
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import useScreenTracking from '../hooks/useScreenTracking';
import { trackButtonClick } from '../services/AnalyticsService';

const { width } = Dimensions.get('window');

const categories = [
  {
    id: 'mixed-drinks',
    title: 'Mixed Drinks',
    subtitle: 'Cocktails & Specialty',
    icon: 'wine',
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&h=600&fit=crop',
    color: '#FF6B35',
    description: 'Crafted cocktails and specialty drinks',
  },
  {
    id: 'spirits',
    title: 'Spirits',
    subtitle: 'Premium Liquor',
    icon: 'flask',
    image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&h=600&fit=crop',
    color: '#4A90E2',
    description: 'Premium spirits and well drinks',
  },
  {
    id: 'beer',
    title: 'Beer',
    subtitle: 'Craft & Domestic',
    icon: 'beer',
    image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=600&fit=crop',
    color: '#F5A623',
    description: 'Craft beers and domestic favorites',
  },
];

export default function BarCategoryScreen({ navigation }) {
  const { theme } = useTheme();
  useScreenTracking('BarCategoryScreen');

  const handleCategoryPress = (category) => {
    trackButtonClick('select_bar_category', 'BarCategoryScreen', { category: category.id });
    navigation.navigate('BarMenuCategory', { categoryId: category.id, categoryName: category.title });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Bar Menu</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Category Cards */}
      <View style={styles.categoriesContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => handleCategoryPress(category)}
            activeOpacity={0.8}
          >
            {/* Image Background */}
            <Image
              source={{ uri: category.image }}
              style={styles.categoryImage}
              resizeMode="cover"
            />
            <View style={[styles.imageOverlay, { backgroundColor: category.color + 'E6' }]} />
            
            {/* Content */}
            <View style={styles.categoryContent}>
              <View style={[styles.iconContainer, { backgroundColor: category.color }]}>
                <Ionicons name={category.icon} size={32} color="#fff" />
              </View>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
              <Text style={styles.categoryDescription}>{category.description}</Text>
              
              {/* Arrow */}
              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  categoryCard: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  categoryImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  categoryContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  arrowContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

