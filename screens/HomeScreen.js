import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import {
  AppLoader,
  EmptyState,
  HomeworkCard,
  ModalShell,
  PrimaryButton,
  RoleToggle,
  ScreenHeader,
  SecondaryButton,
  StatCard,
  StatusBanner,
  TextInputField,
  TuitionCard,
} from '../components';
import { ROUTES } from '../navigation/routes';
import { selectAuthRole, selectAuthUser, selectCanAccessRole } from '../redux/slices/authSlice';
import {
  clearDashboardError,
  clearDashboardSuccess,
  selectDashboardError,
  selectDashboardHomework,
  selectDashboardIsFallbackData,
  selectDashboardLoading,
  selectDashboardRole,
  selectDashboardStats,
  selectDashboardSuccess,
  selectDashboardTuition,
  setDashboardRole,
} from '../redux/slices/dashboardSlice';
import { logoutUser } from '../redux/thunks/authThunks';
import {
  createHomeworkItem,
  createTuitionItem,
  loadDashboardData,
  updateHomeworkItem,
  updateTuitionItem,
} from '../redux/thunks/dashboardThunks';
import { getErrorMessage, isLikelyOfflineError, isLikelyTransientError } from '../services/errorUtils';
import { reportApi } from '../services/reportApi';

const getCurrentMonthDueDate = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(Math.min(28, now.getDate() + 3)).padStart(2, '0');
  return `${month}/${day}`;
};

const toReportSummary = ({ tuition, relatedHomework }) => {
  const lines = [
    `Tuition Report - ${tuition.subject || 'Subject'}`,
    `Student: ${tuition.studentName || 'Not assigned'}`,
    `Payment status: ${tuition.status || 'pending'}`,
    `Amount: ${tuition.amount || 'N/A'}`,
    `Classes this month: ${Number(tuition.takenClasses || 0)}/${Number(tuition.plannedClassesPerMonth || 0)}`,
    `Homework count: ${relatedHomework.length}`,
  ];

  return lines.join('\n');
};

export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();

  const user = useSelector(selectAuthUser, shallowEqual);
  const authRole = useSelector(selectAuthRole);
  const role = useSelector(selectDashboardRole);
  const canAccessSelectedRole = useSelector((state) => selectCanAccessRole(state, role));
  const stats = useSelector(selectDashboardStats, shallowEqual);
  const homeworkItems = useSelector(selectDashboardHomework, shallowEqual);
  const tuitionItems = useSelector(selectDashboardTuition, shallowEqual);
  const isLoading = useSelector(selectDashboardLoading);
  const error = useSelector(selectDashboardError);
  const successMessage = useSelector(selectDashboardSuccess);
  const isFallbackData = useSelector(selectDashboardIsFallbackData);

  const [isTuitionModalOpen, setIsTuitionModalOpen] = useState(false);
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [studentAssignTargetId, setStudentAssignTargetId] = useState(null);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [reportNotice, setReportNotice] = useState(null);

  const [tuitionForm, setTuitionForm] = useState({
    subject: '',
    studentName: '',
    amount: '$0',
    dueDate: getCurrentMonthDueDate(),
    plannedClassesPerMonth: '8',
    note: '',
  });
  const [homeworkForm, setHomeworkForm] = useState({
    tuitionId: '',
    title: '',
    subject: '',
    dueDate: getCurrentMonthDueDate(),
    description: '',
  });

  const roleOptions = useMemo(
    () =>
      authRole
        ? [{ label: authRole === 'teacher' ? 'Teacher' : 'Student', value: authRole }]
        : [{ label: 'Student', value: 'student' }],
    [authRole]
  );

  const feedSections = useMemo(() => ['stats', 'homework', 'tuition', 'actions'], []);
  const userGreeting = useMemo(() => `Hello ${user?.name || user?.email || 'Learner'}`, [user?.email, user?.name]);
  const isOfflineError = useMemo(() => isLikelyOfflineError(error), [error]);
  const canRetry = useMemo(
    () => Boolean(error) && (isLikelyTransientError(error) || isOfflineError),
    [error, isOfflineError]
  );
  const showInlineLoader =
    isLoading && !stats.length && !homeworkItems.length && !tuitionItems.length && !error;

  const isTeacherView = role === 'teacher';

  useEffect(() => {
    if (role && canAccessSelectedRole) {
      dispatch(loadDashboardData({ role }));
    }
  }, [canAccessSelectedRole, dispatch, role]);

  useEffect(() => {
    if (authRole && role !== authRole) {
      dispatch(setDashboardRole(authRole));
    }
  }, [authRole, dispatch, role]);

  const handleRefresh = useCallback(() => {
    if (role && canAccessSelectedRole) {
      dispatch(loadDashboardData({ role }));
    }
  }, [canAccessSelectedRole, dispatch, role]);

  const handleRoleChange = useCallback(
    (nextRole) => {
      if (authRole === nextRole) {
        dispatch(setDashboardRole(nextRole));
        handleRefresh();
        return;
      }

      dispatch(clearDashboardError());
    },
    [authRole, dispatch, handleRefresh]
  );

  const handleLogout = useCallback(async () => {
    await dispatch(logoutUser());
  }, [dispatch]);

  const resetTuitionForm = () => {
    setTuitionForm({
      subject: '',
      studentName: '',
      amount: '$0',
      dueDate: getCurrentMonthDueDate(),
      plannedClassesPerMonth: '8',
      note: '',
    });
  };

  const resetHomeworkForm = () => {
    setHomeworkForm({
      tuitionId: '',
      title: '',
      subject: '',
      dueDate: getCurrentMonthDueDate(),
      description: '',
    });
  };

  const handleCreateTuition = async () => {
    if (!tuitionForm.subject.trim()) {
      return;
    }

    const item = {
      id: `tuition-${Date.now()}`,
      studentName: tuitionForm.studentName.trim() || 'Student not assigned',
      subject: tuitionForm.subject.trim(),
      amount: tuitionForm.amount.trim() || '$0',
      dueDate: tuitionForm.dueDate.trim() || getCurrentMonthDueDate(),
      status: 'pending',
      note: tuitionForm.note.trim(),
      plannedClassesPerMonth: Number(tuitionForm.plannedClassesPerMonth) || 8,
      takenClasses: 0,
      classHistory: [],
      studentEmail: '',
    };

    try {
      await dispatch(createTuitionItem({ role, item })).unwrap();
      setIsTuitionModalOpen(false);
      resetTuitionForm();
    } catch {
      // Error state is handled by dashboard slice banners.
    }
  };

  const handleCreateHomework = async () => {
    if (!homeworkForm.title.trim() || !homeworkForm.subject.trim() || !homeworkForm.tuitionId) {
      return;
    }

    const item = {
      id: `hw-${Date.now()}`,
      tuitionId: homeworkForm.tuitionId,
      title: homeworkForm.title.trim(),
      subject: homeworkForm.subject.trim(),
      dueDate: homeworkForm.dueDate.trim() || getCurrentMonthDueDate(),
      status: 'pending',
      description: homeworkForm.description.trim(),
    };

    try {
      await dispatch(createHomeworkItem({ role, item })).unwrap();
      setIsHomeworkModalOpen(false);
      resetHomeworkForm();
    } catch {
      // Error state is handled by dashboard slice banners.
    }
  };

  const handleClassDone = async (tuition) => {
    const nextTakenClasses = Number(tuition.takenClasses || 0) + 1;
    const classHistory = Array.isArray(tuition.classHistory) ? tuition.classHistory : [];

    try {
      await dispatch(
        updateTuitionItem({
          role,
          itemId: tuition.id,
          updates: {
            takenClasses: nextTakenClasses,
            classHistory: [
              ...classHistory,
              {
                action: 'class_done',
                date: new Date().toISOString(),
              },
            ],
          },
        })
      ).unwrap();
    } catch {
      // Error state is handled by dashboard slice banners.
    }
  };

  const handleMarkPaymentDone = async (tuition) => {
    try {
      await dispatch(
        updateTuitionItem({
          role,
          itemId: tuition.id,
          updates: {
            status: 'paid',
            note: tuition.note ? `${tuition.note} Payment marked complete.` : 'Payment marked complete.',
          },
        })
      ).unwrap();
    } catch {
      // Error state is handled by dashboard slice banners.
    }
  };

  const handleAssignStudent = async () => {
    if (!studentAssignTargetId || !studentEmail.trim()) {
      return;
    }

    try {
      await dispatch(
        updateTuitionItem({
          role,
          itemId: studentAssignTargetId,
          updates: {
            studentEmail: studentEmail.trim().toLowerCase(),
            studentName: studentName.trim() || undefined,
          },
        })
      ).unwrap();

      setStudentAssignTargetId(null);
      setStudentEmail('');
      setStudentName('');
    } catch {
      // Error state is handled by dashboard slice banners.
    }
  };

  const handleHomeworkDone = async (item) => {
    try {
      await dispatch(
        updateHomeworkItem({
          role,
          itemId: item.id,
          updates: {
            status: 'completed',
            completedAt: new Date().toISOString(),
          },
        })
      ).unwrap();
    } catch {
      // Error state is handled by dashboard slice banners.
    }
  };

  const handleOpenDetails = (tuitionId) => {
    navigation.navigate(ROUTES.TUITION_DETAIL, { tuitionId });
  };

  const handleDownloadReport = async (tuition) => {
    const relatedHomework = homeworkItems.filter((item) => item.tuitionId === tuition.id);

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
        setReportNotice({
          type: 'success',
          message: 'Report link generated by backend service.',
        });
        return;
      }

      if (remoteReport?.shareMessage) {
        await Share.share({
          title: 'Tuition Report',
          message: String(remoteReport.shareMessage),
        });
        setReportNotice({
          type: 'success',
          message: 'Report downloaded from backend service.',
        });
        return;
      }

      throw new Error('Report backend did not return shareable data.');
    } catch (error) {
      const message = getErrorMessage(error, 'Report backend unavailable. Shared a summary instead.');
      setReportNotice({
        type: 'info',
        message: `${message} Backend dependency: configure report endpoint to enable file download.`,
      });

      try {
        await Share.share({
          title: 'Tuition Report',
          message: toReportSummary({ tuition, relatedHomework }),
        });
      } catch {
        // Ignore share failures; report fallback notice is still shown in the banner.
      }
    }
  };

  const renderStatCard = useCallback(
    ({ item }) => (
      <StatCard
        label={item.label}
        value={item.value}
        caption={item.caption}
        trend={item.trend}
        trendDirection={item.trendDirection}
        style={styles.statCard}
      />
    ),
    []
  );

  const renderHomeworkItem = useCallback(
    ({ item }) => (
      <View style={styles.cardWrap}>
        <HomeworkCard
          title={item.title}
          subject={item.subject}
          dueDate={item.dueDate}
          status={item.status}
          description={item.description}
          onPress={() => {
            if (item.tuitionId) {
              handleOpenDetails(item.tuitionId);
            }
          }}
        />
        {isTeacherView && item.status !== 'completed' ? (
          <SecondaryButton label="Mark Homework Done" onPress={() => handleHomeworkDone(item)} />
        ) : null}
      </View>
    ),
    [isTeacherView]
  );

  const renderTuitionItem = useCallback(
    ({ item }) => (
      <View style={styles.cardWrap}>
        <TuitionCard
          studentName={item.studentName}
          subject={item.subject}
          amount={item.amount}
          dueDate={item.dueDate}
          status={item.status}
          note={item.note}
          onPress={() => handleOpenDetails(item.id)}
        />

        <View style={styles.rowButtons}>
          <SecondaryButton
            label="View Details"
            onPress={() => handleOpenDetails(item.id)}
            fullWidth={false}
            style={styles.rowButton}
          />
          <SecondaryButton
            label="Download Report"
            onPress={() => handleDownloadReport(item)}
            fullWidth={false}
            style={styles.rowButton}
          />
        </View>

        {isTeacherView ? (
          <View style={styles.rowButtons}>
            <SecondaryButton
              label="Add Class"
              onPress={() => handleClassDone(item)}
              fullWidth={false}
              style={styles.rowButton}
            />
            <SecondaryButton
              label="Mark Payment"
              onPress={() => handleMarkPaymentDone(item)}
              fullWidth={false}
              style={styles.rowButton}
            />
            <SecondaryButton
              label="Add Student"
              onPress={() => {
                setStudentAssignTargetId(item.id);
                setStudentEmail(item.studentEmail || '');
                setStudentName(item.studentName || '');
              }}
              fullWidth={false}
              style={styles.rowButton}
            />
          </View>
        ) : null}
      </View>
    ),
    [isTeacherView]
  );

  const renderFeedSection = useCallback(
    ({ item }) => {
      if (item === 'stats') {
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            {stats.length ? (
              <FlatList
                data={stats}
                horizontal
                keyExtractor={(stat) => stat.label}
                renderItem={renderStatCard}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.statRow}
              />
            ) : (
              <EmptyState title="No overview data" description="Pull to refresh to sync your dashboard." />
            )}
          </View>
        );
      }

      if (item === 'homework') {
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Homework</Text>
            {homeworkItems.length ? (
              <FlatList
                data={homeworkItems}
                keyExtractor={(homework) => homework.id}
                renderItem={renderHomeworkItem}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              />
            ) : (
              <EmptyState
                title="No homework yet"
                description={isTeacherView ? 'Create homework to assign students.' : 'Assignments will appear here once loaded.'}
              />
            )}
          </View>
        );
      }

      if (item === 'tuition') {
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tuition</Text>
            {tuitionItems.length ? (
              <FlatList
                data={tuitionItems}
                keyExtractor={(tuition) => tuition.id}
                renderItem={renderTuitionItem}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              />
            ) : (
              <EmptyState
                title="No tuition updates"
                description={isTeacherView ? 'Create your first tuition record.' : 'Your teacher will assign classes soon.'}
              />
            )}
          </View>
        );
      }

      return (
        <View style={styles.section}>
          {isTeacherView ? (
            <>
              <PrimaryButton label="Add Tuition" onPress={() => setIsTuitionModalOpen(true)} />
              <SecondaryButton
                label="Add Homework"
                onPress={() => {
                  setHomeworkForm((prev) => ({
                    ...prev,
                    tuitionId: prev.tuitionId || tuitionItems?.[0]?.id || '',
                  }));
                  setIsHomeworkModalOpen(true);
                }}
              />
            </>
          ) : null}

          <PrimaryButton label="Log out" disabled={isLoading} onPress={handleLogout} />
        </View>
      );
    },
    [
      handleLogout,
      homeworkItems,
      isLoading,
      isTeacherView,
      renderHomeworkItem,
      renderStatCard,
      renderTuitionItem,
      stats,
      tuitionItems,
    ]
  );

  if (showInlineLoader) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Home" subtitle={userGreeting} rightAction={<Text style={styles.roleChip}>{role}</Text>} />
        <AppLoader label="Syncing dashboard..." fullScreen={false} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="Home" subtitle={userGreeting} rightAction={<Text style={styles.roleChip}>{role}</Text>} />

      <FlatList
        data={feedSections}
        keyExtractor={(section) => section}
        renderItem={renderFeedSection}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.sectionGap} />}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor="#1D4ED8" />}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <RoleToggle value={role} onChange={handleRoleChange} disabled={isLoading} options={roleOptions} />

            {authRole && !canAccessSelectedRole ? (
              <StatusBanner
                type="error"
                title="Access blocked"
                message="You are not authorized to access this role data."
                onClose={() => {
                  dispatch(clearDashboardError());
                  dispatch(setDashboardRole(authRole));
                }}
              />
            ) : null}

            {error ? (
              <StatusBanner
                type="error"
                title={isOfflineError ? 'You are offline' : 'Could not load dashboard'}
                message={error}
                actionLabel={canRetry ? 'Retry now' : undefined}
                onAction={canRetry ? handleRefresh : undefined}
                onClose={() => dispatch(clearDashboardError())}
              />
            ) : null}

            {!error && successMessage ? (
              <StatusBanner
                type="success"
                title="Dashboard ready"
                message={successMessage}
                onClose={() => dispatch(clearDashboardSuccess())}
              />
            ) : null}

            {!error && isFallbackData ? (
              <StatusBanner
                type="info"
                title="Limited data mode"
                message="Showing fallback dashboard data due to temporary service issues. Pull to refresh again in a moment."
                actionLabel="Try refresh"
                onAction={handleRefresh}
                onClose={() => dispatch(clearDashboardSuccess())}
              />
            ) : null}

            {reportNotice ? (
              <StatusBanner
                type={reportNotice.type}
                title="Report status"
                message={reportNotice.message}
                onClose={() => setReportNotice(null)}
              />
            ) : null}

            <PrimaryButton
              label="Refresh Dashboard"
              loading={isLoading}
              disabled={!canAccessSelectedRole}
              onPress={handleRefresh}
            />
          </View>
        }
      />

      <ModalShell
        visible={isTuitionModalOpen}
        title="Add Tuition"
        subtitle="Create a new class record"
        onClose={() => setIsTuitionModalOpen(false)}
        footer={
          <PrimaryButton label="Save Tuition" onPress={handleCreateTuition} disabled={!tuitionForm.subject.trim() || isLoading} />
        }
      >
        <View style={styles.modalForm}>
          <TextInputField
            label="Subject"
            value={tuitionForm.subject}
            onChangeText={(value) => setTuitionForm((prev) => ({ ...prev, subject: value }))}
            placeholder="Physics"
          />
          <TextInputField
            label="Student Name"
            value={tuitionForm.studentName}
            onChangeText={(value) => setTuitionForm((prev) => ({ ...prev, studentName: value }))}
            placeholder="Optional"
          />
          <TextInputField
            label="Amount"
            value={tuitionForm.amount}
            onChangeText={(value) => setTuitionForm((prev) => ({ ...prev, amount: value }))}
            placeholder="$320"
          />
          <TextInputField
            label="Due Date"
            value={tuitionForm.dueDate}
            onChangeText={(value) => setTuitionForm((prev) => ({ ...prev, dueDate: value }))}
            placeholder="MM/DD"
          />
          <TextInputField
            label="Planned Classes / Month"
            value={tuitionForm.plannedClassesPerMonth}
            onChangeText={(value) => setTuitionForm((prev) => ({ ...prev, plannedClassesPerMonth: value }))}
            keyboardType="numeric"
          />
          <TextInputField
            label="Note"
            value={tuitionForm.note}
            onChangeText={(value) => setTuitionForm((prev) => ({ ...prev, note: value }))}
            placeholder="Optional note"
          />
        </View>
      </ModalShell>

      <ModalShell
        visible={isHomeworkModalOpen}
        title="Add Homework"
        subtitle="Assign a homework item"
        onClose={() => setIsHomeworkModalOpen(false)}
        footer={
          <PrimaryButton
            label="Assign Homework"
            onPress={handleCreateHomework}
            disabled={!homeworkForm.title.trim() || !homeworkForm.subject.trim() || !homeworkForm.tuitionId || isLoading}
          />
        }
      >
        <View style={styles.modalForm}>
          <TextInputField
            label="Tuition ID"
            value={homeworkForm.tuitionId}
            onChangeText={(value) => setHomeworkForm((prev) => ({ ...prev, tuitionId: value }))}
            helperText="Use the tuition card record id"
          />
          <TextInputField
            label="Title"
            value={homeworkForm.title}
            onChangeText={(value) => setHomeworkForm((prev) => ({ ...prev, title: value }))}
          />
          <TextInputField
            label="Subject"
            value={homeworkForm.subject}
            onChangeText={(value) => setHomeworkForm((prev) => ({ ...prev, subject: value }))}
          />
          <TextInputField
            label="Due Date"
            value={homeworkForm.dueDate}
            onChangeText={(value) => setHomeworkForm((prev) => ({ ...prev, dueDate: value }))}
            placeholder="MM/DD"
          />
          <TextInputField
            label="Description"
            value={homeworkForm.description}
            onChangeText={(value) => setHomeworkForm((prev) => ({ ...prev, description: value }))}
            multiline
          />
        </View>
      </ModalShell>

      <ModalShell
        visible={Boolean(studentAssignTargetId)}
        title="Add Student"
        subtitle="Assign student details to tuition"
        onClose={() => setStudentAssignTargetId(null)}
        footer={
          <PrimaryButton
            label="Save Student"
            onPress={handleAssignStudent}
            disabled={!studentEmail.trim() || isLoading}
          />
        }
      >
        <View style={styles.modalForm}>
          <TextInputField
            label="Student Email"
            value={studentEmail}
            onChangeText={setStudentEmail}
            keyboardType="email-address"
            placeholder="student@example.com"
            autoCapitalize="none"
          />
          <TextInputField
            label="Student Name"
            value={studentName}
            onChangeText={setStudentName}
            placeholder="Optional"
          />
        </View>
      </ModalShell>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  headerContent: {
    gap: 14,
    marginBottom: 16,
  },
  roleChip: {
    textTransform: 'capitalize',
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statRow: {
    gap: 10,
    paddingRight: 8,
  },
  statCard: {
    minWidth: 160,
  },
  section: {
    gap: 10,
  },
  sectionGap: {
    height: 16,
  },
  itemSeparator: {
    height: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardWrap: {
    gap: 8,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowButton: {
    flex: 1,
    minWidth: 110,
  },
  modalForm: {
    gap: 10,
    paddingBottom: 8,
  },
});
