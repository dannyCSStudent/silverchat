import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';

type Metric = {
  label: string;
  value: string | number;
  tone?: 'default' | 'dark';
};

type CRMHeroProps = {
  backgroundColor: string;
  badge?: ReactNode;
  copy: string;
  metrics?: Metric[];
  title: string;
};

export function CRMHero({ backgroundColor, badge, copy, metrics = [], title }: CRMHeroProps) {
  return (
    <ThemedView style={[styles.hero, { backgroundColor }]}>
      <ThemedText style={styles.eyebrow}>Client workspace</ThemedText>
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText style={styles.copy}>{copy}</ThemedText>
      {metrics.length ? (
        <View style={styles.metrics}>
          {metrics.map((metric) => {
            const dark = metric.tone === 'dark';

            return (
              <View key={metric.label} style={[styles.metricCard, dark && styles.metricCardDark]}>
                <ThemedText style={dark ? styles.metricLabelLight : styles.metricLabel}>
                  {metric.label}
                </ThemedText>
                <ThemedText style={dark ? styles.metricValueLight : styles.metricValue}>
                  {metric.value}
                </ThemedText>
              </View>
            );
          })}
        </View>
      ) : null}
      {badge}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 32,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.08)',
    gap: 14,
    shadowColor: '#412F1E',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: '#6D7A88',
    fontWeight: '700',
  },
  title: {
    fontFamily: Fonts.rounded,
    lineHeight: 38,
  },
  copy: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4F5E6C',
  },
  metrics: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(24,33,43,0.06)',
  },
  metricCardDark: {
    backgroundColor: '#0F172A',
  },
  metricLabel: {
    color: '#6D7A88',
    fontSize: 13,
  },
  metricValue: {
    color: '#18212B',
    fontSize: 28,
    fontWeight: '700',
  },
  metricLabelLight: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  metricValueLight: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '700',
  },
});
