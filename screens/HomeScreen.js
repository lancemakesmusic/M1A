import React from 'react';
import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>M1A Home</Text>
      <Text>Welcome to your social, event, and artist platform!</Text>
    </View>
  );
}

