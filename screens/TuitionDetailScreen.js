import React, { useMemo } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { EmptyState, HomeworkCard, PrimaryButton, ProgressBar, ScreenHeader, TuitionCard } from '../components';
import { selectDashboardHomework, selectDashboardTuition } from '../redux/slices/dashboardSlice';
import { getErrorMessage } from '../services/errorUtils';
import { reportApi } from '../services/reportApi';

const formatClassDate = (value) => {
  if (!value) {
    return 'Unknown date';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString();
};

export default function TuitionDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const tuitionId = route?.params?.tuitionId;
  const tuitionItems = useSelector(selectDashboardTuition);
  const homeworkItems = useSelector(selectDashboardHomework);

  const tuition = useMemo(() => tuitionItems.find((item) => item.id === tuitionId), [tuitionId, tuitionItems]);
  const relatedHomework = useMemo(
    () => homeworkItems.filter((item) => item.tuitionId === tuitionId),
    [homeworkItems, tuitionId]
  );
  const classHistory = Array.isArray(tuition?.classHistory) ? tuition.classHistory : [];

  const progress = useMemo(() => {
    const planned = Number(tuition?.plannedClassesPerMonth || 0);
    const taken = Number(tuition?.takenClasses || 0);

    if (!planned) {
      return 0;
    }

    return Math.min(100, Math.round((taken / planned) * 100));
  }, [tuition?.plannedClassesPerMonth, tuition?.takenClasses]);

  const handleShareReport = async () => {
    if (!tuition) {
      return;
    }

    const planned = Number(tuition.plannedClassesPerMonth || 0);
    const taken = Number(tuition.takenClasses || 0);
    const summary = [
      `Tuition Report - ${tuition.subject || 'Subject'}`,
      `Student: ${tuition.studentName || 'N/A'}`,
      `Payment status: ${tuition.status || 'pending'}`,
      `Classes this month: ${taken}/${planned || 0}`,
      `Homework items: ${relatedHomework.length}`,
      `History entries: ${classHistory.length}`,
    ].join('\n');

    try {
      const remoteReport = await reportApi.fetchTuitionReport({
        tuitionId: tuition.id,
        month: tuition.currentMonthYear,
      });

      if (remoteReport?.downloadUrl) {
        await Share.share({
          title: 'Tuition Report',
          message: `Download report: ${remoteReport.downloadUrl}`,
        });
        return;
      }

      if (remoteReport?.shareMessage) {
        await Share.share({
          title: 'Tuition Report',
          message: String(remoteReport.shareMessage),
        });
        return;
      }

      throw new Error('Report backend did not return shareable data.');
    } catch (error) {
      const fallbackSummary = `${summary}\n\n${getErrorMessage(
        error,
        'Backend report endpoint is unavailable. Showing local summary instead.'
      )}`;

      await Share.share({
        title: 'Tuition Report',
        message: fallbackSummary,
      });
    }
  };

  if (!tuition) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Tuition Details" subtitle="Record not found" onBackPress={() => navigation.goBack()} />
        <View style={styles.content}>
          <EmptyState title="Tuition not found" description="Refresh dashboard data and try opening this tuition again." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      
      <ScreenHeader
        title={tuition.subject || 'Tuition Details'}
        subtitle={tuition.studentName ? `Student: ${tuition.studentName}` : 'Student not assigned'}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <TuitionCard
          studentName={tuition.studentName}
          subject={tuition.subject}
          amount={tuition.amount}
          dueDate={tuition.dueDate}
          status={tuition.status}
          note={tuition.note}
        />

        <View style={styles.progressCard}>
          <Text style={styles.sectionTitle}>Class Progress</Text>
          <Text style={styles.meta}>
            {Number(tuition.takenClasses || 0)}/{Number(tuition.plannedClassesPerMonth || 0)} classes this month
          </Text>
          <ProgressBar progress={progress} />
          <Text style={styles.meta}>{progress}% complete</Text>
        </View>

        <PrimaryButton label="Download Report" onPress={handleShareReport} />

        <Text style={styles.sectionTitle}>Homework</Text>
        {relatedHomework.length ? (
          <View style={styles.sectionList}>
            {relatedHomework.map((item) => (
              <HomeworkCard
                key={item.id}
                title={item.title}
                subject={item.subject}
                dueDate={item.dueDate}
                status={item.status}
                description={item.description}
              />
            ))}
          </View>
        ) : (
          <EmptyState title="No homework" description="Homework for this tuition will appear here." />
        )}

        <Text style={styles.sectionTitle}>Class History</Text>
        {classHistory.length ? (
          <View style={styles.sectionList}>
            {classHistory.map((entry, index) => (
              <View key={`${entry?.date || 'entry'}-${index}`} style={styles.historyItem}>
                <Text style={styles.historyTitle}>{entry?.action || 'class_update'}</Text>
                <Text style={styles.meta}>{formatClassDate(entry?.date)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="No class history" description="Class updates will be logged after teacher actions." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingVertical: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  meta: {
    fontSize: 13,
    color: '#475569',
  },
  progressCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  sectionList: {
    gap: 10,
  },
  historyItem: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    textTransform: 'capitalize',
  },
});
