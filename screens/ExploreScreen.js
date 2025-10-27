import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../firebase';

const { width } = Dimensions.get('window');
const itemWidth = (width - 60) / 2; // 2 columns with padding

// Mock data - reorganized under 3 main categories: Events, Services, Bar
const mockItems = [
  // EVENTS
  {
    id: '1',
    name: 'Live Concert Performance',
    description: 'Full band performance for your event',
    price: 500,
    category: 'Events',
    subcategory: 'Live Performance',
    rating: 4.7,
    popularity: 92,
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=400&fit=crop',
    artist: 'The Groove Masters',
    duration: '2-3 hours',
  },
  {
    id: '2',
    name: 'DJ Set for Events',
    description: 'Professional DJ services for parties and events',
    price: 300,
    category: 'Events',
    subcategory: 'DJ Services',
    rating: 4.5,
    popularity: 90,
    image: 'https://images.unsplash.com/photo-1571266028243-e68f857cf30f?w=400&h=400&fit=crop',
    artist: 'DJ MixMaster',
    duration: '4-6 hours',
  },
  {
    id: '3',
    name: 'Event Photography',
    description: 'Professional event photography services',
    price: 400,
    category: 'Events',
    subcategory: 'Photography',
    rating: 4.7,
    popularity: 89,
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    artist: 'Capture Moments',
    duration: '4-8 hours',
  },
  {
    id: '4',
    name: 'Wedding Music Package',
    description: 'Complete musical experience for your special day',
    price: 800,
    category: 'Events',
    subcategory: 'Wedding Services',
    rating: 4.9,
    popularity: 95,
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
    artist: 'Elegant Sounds',
    duration: '6-8 hours',
  },
  {
    id: '5',
    name: 'Corporate Event Entertainment',
    description: 'Professional entertainment for corporate gatherings',
    price: 600,
    category: 'Events',
    subcategory: 'Corporate',
    rating: 4.6,
    popularity: 88,
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    artist: 'Business Beats',
    duration: '3-4 hours',
  },

  // SERVICES
  {
    id: '6',
    name: 'Studio Recording Session',
    description: 'Professional studio recording with experienced sound engineer',
    price: 150,
    category: 'Services',
    subcategory: 'Music Production',
    rating: 4.8,
    popularity: 95,
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    artist: 'SoundWave Studios',
    duration: '2-8 hours',
  },
  {
    id: '7',
    name: 'Mixing & Mastering',
    description: 'Professional mixing and mastering for your tracks',
    price: 200,
    category: 'Services',
    subcategory: 'Audio Production',
    rating: 4.9,
    popularity: 88,
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
    artist: 'AudioMaster Pro',
    duration: '3-5 days',
  },
  {
    id: '8',
    name: 'Music Video Production',
    description: 'Professional music video creation',
    price: 800,
    category: 'Services',
    subcategory: 'Video Production',
    rating: 4.6,
    popularity: 85,
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    artist: 'Visual Arts Studio',
    duration: '1-2 weeks',
  },
  {
    id: '9',
    name: 'Vocal Coaching',
    description: 'One-on-one vocal training sessions',
    price: 80,
    category: 'Services',
    subcategory: 'Music Education',
    rating: 4.9,
    popularity: 87,
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    artist: 'Vocal Excellence',
    duration: '1 hour',
  },
  {
    id: '10',
    name: 'Sound Design',
    description: 'Custom sound effects and audio design',
    price: 250,
    category: 'Services',
    subcategory: 'Audio Production',
    rating: 4.8,
    popularity: 82,
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
    artist: 'AudioCraft Studio',
    duration: '1-3 days',
  },
  {
    id: '11',
    name: 'Instrument Lessons',
    description: 'Learn guitar, piano, drums, or any instrument',
    price: 60,
    category: 'Services',
    subcategory: 'Music Education',
    rating: 4.7,
    popularity: 91,
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    artist: 'Music Academy',
    duration: '1 hour',
  },
  {
    id: '12',
    name: 'Songwriting Workshop',
    description: 'Learn the art of songwriting from professionals',
    price: 120,
    category: 'Services',
    subcategory: 'Music Education',
    rating: 4.8,
    popularity: 84,
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
    artist: 'Creative Writers',
    duration: '2 hours',
  },
  {
    id: '13',
    name: 'Auto Poster',
    description: 'AI-powered content generation and social media scheduling',
    price: 50,
    category: 'Services',
    subcategory: 'Digital Marketing',
    rating: 4.9,
    popularity: 96,
    image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop',
    artist: 'AI Content Studio',
    duration: 'Instant',
    isAutoPoster: true,
  },

  // BAR
  {
    id: '14',
    name: 'Craft Cocktails',
    description: 'Premium handcrafted cocktails made to order',
    price: 15,
    category: 'Bar',
    subcategory: 'Drinks',
    rating: 4.8,
    popularity: 94,
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop',
    artist: 'Mixology Masters',
    duration: '5-10 minutes',
  },
  {
    id: '15',
    name: 'Wine Selection',
    description: 'Curated selection of fine wines from around the world',
    price: 12,
    category: 'Bar',
    subcategory: 'Drinks',
    rating: 4.7,
    popularity: 89,
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400&h=400&fit=crop',
    artist: 'Wine Connoisseurs',
    duration: 'Immediate',
  },
  {
    id: '16',
    name: 'Beer & Spirits',
    description: 'Wide selection of craft beers and premium spirits',
    price: 8,
    category: 'Bar',
    subcategory: 'Drinks',
    rating: 4.5,
    popularity: 92,
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop',
    artist: 'Brew Masters',
    duration: 'Immediate',
  },
  {
    id: '17',
    name: 'Bar Snacks & Appetizers',
    description: 'Delicious snacks and appetizers to complement your drinks',
    price: 10,
    category: 'Bar',
    subcategory: 'Food',
    rating: 4.6,
    popularity: 87,
    image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=400&fit=crop',
    artist: 'Culinary Delights',
    duration: '10-15 minutes',
  },
  {
    id: '17',
    name: 'Non-Alcoholic Beverages',
    description: 'Fresh juices, sodas, and specialty non-alcoholic drinks',
    price: 6,
    category: 'Bar',
    subcategory: 'Drinks',
    rating: 4.4,
    popularity: 85,
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop',
    artist: 'Refreshment Station',
    duration: 'Immediate',
  },
  {
    id: '18',
    name: 'Premium Bottle Service',
    description: 'Exclusive bottle service with VIP treatment',
    price: 200,
    category: 'Bar',
    subcategory: 'VIP Service',
    rating: 4.9,
    popularity: 96,
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop',
    artist: 'VIP Experience',
    duration: 'All night',
  },
];

export default function ExploreScreen({ navigation }) {
  const { theme } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Events', 'Services', 'Bar'];

  useEffect(() => {
    loadItems();
  }, []); // Empty dependency array - loadItems is stable

  const loadItems = useCallback(async () => {
    try {
      // Try to load from Firebase first
      const qref = query(collection(db, 'menuItems'), orderBy('name'));
      const snap = await getDocs(qref);
      const firebaseItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (firebaseItems.length > 0) {
        setItems(firebaseItems);
      } else {
        // Fallback to mock data
        setItems(mockItems);
      }
    } catch (e) {
      console.warn('Firebase load failed, using mock data:', e);
      setItems(mockItems);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array - mockItems is static

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const filteredItems = items.filter(item => 
    selectedCategory === 'All' || item.category === selectedCategory
  );

  const getCategoryCount = (category) => {
    if (category === 'All') return items.length;
    return items.filter(item => item.category === category).length;
  };

  const handleItemPress = (item) => {
    // Special handling for AutoPoster
    if (item.isAutoPoster) {
      navigation.navigate('AutoPoster');
      return;
    }
    
    Alert.alert(
      item.name,
      `${item.description}\n\nArtist: ${item.artist}\nPrice: $${item.price}\nDuration: ${item.duration}\nRating: ${item.rating}/5`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Book Now', onPress: () => Alert.alert('Booking', 'Booking feature coming soon!') },
        { text: 'View Details', onPress: () => Alert.alert('Details', 'Detailed view coming soon!') },
      ]
    );
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.instagramCard,
        { backgroundColor: theme.cardBackground },
        index % 2 === 0 ? styles.leftCard : styles.rightCard
      ]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.8}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image }}
          style={styles.serviceImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay}>
          <View style={[styles.priceBadge, { backgroundColor: theme.primary }]}>
            <Text style={[styles.priceText, { color: theme.background }]}>${item.price}</Text>
          </View>
          <View style={[styles.ratingBadge, { backgroundColor: theme.secondary }]}>
            <Ionicons name="star" size={12} color={theme.background} />
            <Text style={[styles.ratingText, { color: theme.background }]}>{item.rating}</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={[styles.serviceName, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.artistName, { color: theme.subtext }]} numberOfLines={1}>
          {item.artist}
        </Text>
        <View style={styles.categoryContainer}>
          <View style={[styles.categoryTag, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.categoryText, { color: theme.primary }]}>
              {item.subcategory}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Events': return 'calendar';
      case 'Services': return 'musical-notes';
      case 'Bar': return 'wine';
      case 'All': return 'grid';
      default: return 'grid';
    }
  };

  const renderCategoryFilter = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        { 
          backgroundColor: selectedCategory === item ? theme.primary : theme.cardBackground,
          borderColor: selectedCategory === item ? theme.primary : theme.border,
          borderWidth: selectedCategory === item ? 2 : 1
        }
      ]}
      onPress={() => setSelectedCategory(item)}
    >
      <Ionicons 
        name={getCategoryIcon(item)} 
        size={16} 
        color={selectedCategory === item ? '#fff' : theme.text}
        style={styles.categoryIcon}
      />
      <Text
        style={[
          styles.categoryButtonText,
          { color: selectedCategory === item ? '#fff' : theme.text }
        ]}
      >
        {item}
      </Text>
      <View style={[
        styles.countBadge,
        { backgroundColor: selectedCategory === item ? 'rgba(255,255,255,0.3)' : theme.primary + '20' }
      ]}>
        <Text style={[
          styles.countText,
          { color: selectedCategory === item ? '#fff' : theme.primary }
        ]}>
          {getCategoryCount(item)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Explore</Text>
        <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
          Events • Services • Bar
        </Text>
      </View>

      {/* Category Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryFilter}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {/* Instagram-style Grid */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name={getCategoryIcon(selectedCategory)} size={48} color={theme.subtext} />
            <Text style={[styles.emptyText, { color: theme.subtext }]}>
              No {selectedCategory.toLowerCase()} found
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.subtext }]}>
              Try selecting a different category
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  filtersContainer: {
    marginBottom: 15,
  },
  categoryList: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 12,
    minWidth: 100,
    justifyContent: 'center',
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  instagramCard: {
    width: itemWidth,
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
  },
  leftCard: {
    marginRight: 10,
  },
  rightCard: {
    marginLeft: 10,
  },
  imageContainer: {
    position: 'relative',
    height: itemWidth,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: 10,
  },
  priceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  priceText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cardContent: {
    padding: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 12,
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});