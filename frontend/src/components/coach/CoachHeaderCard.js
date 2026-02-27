import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../../config/theme';

const CoachHeaderCard = memo(({ coach, completion = 0, defectCount = 0, position }) => {
    if (!coach) {
        return (
            <View style={styles.placeholder}>
                <MaterialCommunityIcons name="train-car" size={40} color={COLORS.placeholder} />
                <Text style={styles.placeholderText}>Select a coach above to view details</Text>
            </View>
        );
    }

    const completionColor =
        defectCount > 0 ? '#EF4444' :
            completion >= 100 ? '#10B981' :
                completion > 0 ? '#F59E0B' : COLORS.textSecondary;

    return (
        <View style={styles.card}>
            {/* Header row */}
            <View style={styles.headerRow}>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="train-car" size={28} color={COLORS.primary} />
                </View>
                <View style={styles.titleGroup}>
                    <Text style={styles.coachNum}>{coach.coach_number}</Text>
                    {position != null && (
                        <Text style={styles.position}>Coach #{position} in rake</Text>
                    )}
                </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: completionColor }]}>
                        {completion}%
                    </Text>
                    <Text style={styles.statLabel}>Completion</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: defectCount > 0 ? '#EF4444' : '#10B981' }]}>
                        {defectCount}
                    </Text>
                    <Text style={styles.statLabel}>Defects</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: COLORS.textSecondary }]}>
                        {completion >= 100 ? 'Done' : completion > 0 ? 'Active' : 'Pending'}
                    </Text>
                    <Text style={styles.statLabel}>Status</Text>
                </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                    width: `${Math.min(completion, 100)}%`,
                    backgroundColor: completionColor
                }]} />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: SPACING.lg,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.sm,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        gap: SPACING.md,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleGroup: { flex: 1 },
    coachNum: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
    position: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: RADIUS.md,
        padding: SPACING.md,
    },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '800' },
    statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
    divider: { width: 1, height: 32, backgroundColor: COLORS.border },
    progressBg: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl * 2,
        marginHorizontal: SPACING.md,
        gap: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        marginTop: SPACING.sm,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: COLORS.border,
    },
    placeholderText: {
        color: COLORS.placeholder,
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: SPACING.xl,
    },
});

export default CoachHeaderCard;
