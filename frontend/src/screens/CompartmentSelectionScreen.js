import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';

const CompartmentSelectionScreen = ({ route, navigation }) => {
    const params = route.params;
    const { setDraft } = useStore();

    // Logic to determine compartments based on subcategory name
    const isLavatory = params.subcategoryName?.toLowerCase().includes('lavatory');
    const compartments = isLavatory
        ? ['L1', 'L2', 'L3', 'L4']
        : ['D1', 'D2', 'D3', 'D4'];

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    style={{ marginRight: 15, backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
                    onPress={() => navigation.navigate('CombinedSummary', { ...params })}
                >
                    <Text style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 12 }}>Summary</Text>
                </TouchableOpacity>
            )
        });
    }, [navigation, params]);

    const handleSelect = (comp) => {
        setDraft(prev => ({
            ...prev,
            compartment: comp
        }));

        navigation.navigate('ActivitySelection', {
            ...params,
            compartment: comp
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.pills}>
                <View style={styles.pill}><Text style={styles.pillText}>COACH: {params.coachNumber}</Text></View>
                <View style={[styles.pill, styles.activePill]}><Text style={[styles.pillText, { color: '#fff' }]}>{params.categoryName}</Text></View>
                <View style={[styles.pill, { backgroundColor: '#eff6ff' }]}><Text style={[styles.pillText, { color: '#2563eb' }]}>{params.subcategoryName}</Text></View>
            </View>

            <Text style={styles.title}>Select Compartment</Text>
            <Text style={styles.subtitle}>Choose specific {isLavatory ? 'Lavatory' : 'Door'} for inspection</Text>

            <FlatList
                data={compartments}
                keyExtractor={(item) => item}
                numColumns={2}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleSelect(item)}
                    >
                        <View style={styles.iconBox}>
                            <Ionicons
                                name={isLavatory ? "water-outline" : "exit-outline"}
                                size={24}
                                color="#2563eb"
                            />
                        </View>
                        <Text style={styles.compName}>{item}</Text>
                        <Text style={styles.compSub}>Tap to start inspection</Text>
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
    pills: { flexDirection: 'row', marginBottom: 20, flexWrap: 'wrap', gap: 6 },
    pill: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    activePill: { backgroundColor: '#2563eb' },
    pillText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 14, color: '#64748b', marginBottom: 30 },
    list: { paddingBottom: 20 },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        margin: 6,
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        minHeight: 140
    },
    iconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    compName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    compSub: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CompartmentSelectionScreen;
