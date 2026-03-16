import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { createServiceError, normalizeFirebaseError } from './errorUtils';
import { withRetry } from './retry';

const ROLE_COLLECTIONS = {
  teacher: {
    collectionName: 'teacher',
  },
  student: {
    collectionName: 'student',
  },
};

const TUITIONS_COLLECTION = 'tuitions';
const HOMEWORK_COLLECTION = 'homework';
const USERS_COLLECTION = 'users';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const mergeItemsById = (primaryItems = [], secondaryItems = []) => {
  const map = new Map();

  primaryItems.forEach((item) => {
    if (item?.id) {
      map.set(item.id, item);
    }
  });

  secondaryItems.forEach((item) => {
    if (item?.id && !map.has(item.id)) {
      map.set(item.id, item);
    }
  });

  return Array.from(map.values());
};

const isTransientDashboardError = (error) => {
  const code = error?.code || '';
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'resource-exhausted' ||
    code === 'aborted' ||
    code === 'internal' ||
    code === 'auth/network-request-failed' ||
    Boolean(error?.isTransient)
  );
};

const withDashboardRetry = (operation) =>
  withRetry(operation, {
    shouldRetry: (error) => isTransientDashboardError(error),
  });

const getCanonicalTuitionRef = (id) => doc(db, TUITIONS_COLLECTION, id);
const getCanonicalHomeworkRef = (id) => doc(db, HOMEWORK_COLLECTION, id);

const toDocsArray = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

const computeTeacherStats = ({ tuitionItems, homeworkItems }) => {
  const uniqueStudents = new Set(
    tuitionItems
      .map((item) => normalizeEmail(item?.studentEmail))
      .filter(Boolean)
  );
  const pendingPayments = tuitionItems.filter((item) => item?.status !== 'paid').length;
  const pendingHomework = homeworkItems.filter((item) => item?.status !== 'completed').length;

  return [
    {
      label: 'Active Students',
      value: String(uniqueStudents.size),
      caption: 'Assigned to classes',
      trend: `${tuitionItems.length} active tuitions`,
      trendDirection: 'up',
    },
    {
      label: 'Pending Fees',
      value: String(pendingPayments),
      caption: 'Payment records',
      trend: `${pendingHomework} homework pending`,
      trendDirection: pendingPayments > 0 ? 'down' : 'up',
    },
  ];
};

const computeStudentStats = ({ tuitionItems, homeworkItems }) => {
  const activeClasses = tuitionItems.length;
  const classesAttended = tuitionItems.reduce((sum, item) => sum + Number(item?.takenClasses || 0), 0);
  const classesPlanned = tuitionItems.reduce((sum, item) => sum + Number(item?.plannedClassesPerMonth || 0), 0);
  const pendingHomework = homeworkItems.filter((item) => item?.status !== 'completed').length;

  return [
    {
      label: 'Active Classes',
      value: String(activeClasses),
      caption: 'Assigned to you',
      trend: `${classesAttended}/${classesPlanned || 0} classes completed`,
      trendDirection: 'up',
    },
    {
      label: 'Pending Homework',
      value: String(pendingHomework),
      caption: 'Requires attention',
      trend: `${homeworkItems.length - pendingHomework} completed`,
      trendDirection: pendingHomework > 0 ? 'down' : 'up',
    },
  ];
};

const createRoleDashboardData = ({ role, tuitionItems = [], homeworkItems = [] }) => {
  const stats =
    role === 'teacher'
      ? computeTeacherStats({ tuitionItems, homeworkItems })
      : computeStudentStats({ tuitionItems, homeworkItems });

  return {
    stats,
    tuitionItems,
    homeworkItems,
    isFallback: false,
  };
};

const fetchCanonicalDashboardData = async ({ uid, role, userEmail }) => {
  if (role === 'teacher') {
    const tuitionsQuery = query(collection(db, TUITIONS_COLLECTION), where('teacherId', '==', uid));
    const homeworkQuery = query(collection(db, HOMEWORK_COLLECTION), where('teacherId', '==', uid));

    const [tuitionsSnapshot, homeworkSnapshot] = await Promise.all([
      withDashboardRetry(() => getDocs(tuitionsQuery)),
      withDashboardRetry(() => getDocs(homeworkQuery)),
    ]);

    const tuitionItems = toDocsArray(tuitionsSnapshot);
    const homeworkItems = toDocsArray(homeworkSnapshot);

    return createRoleDashboardData({ role, tuitionItems, homeworkItems });
  }

  const normalizedStudentEmail = normalizeEmail(userEmail);

  const [tuitionsByUidSnapshot, homeworkByUidSnapshot] = await Promise.all([
    withDashboardRetry(() => getDocs(query(collection(db, TUITIONS_COLLECTION), where('studentId', '==', uid)))),
    withDashboardRetry(() => getDocs(query(collection(db, HOMEWORK_COLLECTION), where('studentId', '==', uid)))),
  ]);

  let tuitionItems = toDocsArray(tuitionsByUidSnapshot);
  let homeworkItems = toDocsArray(homeworkByUidSnapshot);

  if (normalizedStudentEmail) {
    const [tuitionsByEmailSnapshot, homeworkByEmailSnapshot] = await Promise.all([
      withDashboardRetry(() =>
        getDocs(query(collection(db, TUITIONS_COLLECTION), where('studentEmail', '==', normalizedStudentEmail)))
      ),
      withDashboardRetry(() =>
        getDocs(query(collection(db, HOMEWORK_COLLECTION), where('studentEmail', '==', normalizedStudentEmail)))
      ),
    ]);

    tuitionItems = mergeItemsById(tuitionItems, toDocsArray(tuitionsByEmailSnapshot));
    homeworkItems = mergeItemsById(homeworkItems, toDocsArray(homeworkByEmailSnapshot));
  }

  return createRoleDashboardData({ role, tuitionItems, homeworkItems });
};

const ensureFirestore = () => {
  if (!isFirebaseConfigured || !db) {
    throw createServiceError({
      code: 'config/not-configured',
      fallbackMessage: 'App configuration is incomplete. Please contact support.',
    });
  }
};

const ensureSupportedRole = (role) => {
  if (!ROLE_COLLECTIONS[role]) {
    throw createServiceError({
      code: 'validation/unsupported-role',
      fallbackMessage: 'Unsupported role selected. Please choose teacher or student.',
    });
  }
};

const ensureRoleAccess = ({ userRole, requestedRole }) => {
  ensureSupportedRole(userRole);
  ensureSupportedRole(requestedRole);

  if (userRole !== requestedRole) {
    throw createServiceError({
      code: 'validation/forbidden-role-access',
      fallbackMessage: 'You are not authorized to access this role data.',
    });
  }
};

const ensureTeacherMutationAccess = ({ userRole }) => {
  if (userRole !== 'teacher') {
    throw createServiceError({
      code: 'validation/forbidden-role-access',
      fallbackMessage: 'Only teachers can perform this action.',
    });
  }
};

const getRoleCollection = (role) => ROLE_COLLECTIONS[role];

const toDashboardResponse = (dashboardDoc) => ({
  stats: Array.isArray(dashboardDoc?.stats) ? dashboardDoc.stats : [],
  homeworkItems: Array.isArray(dashboardDoc?.homeworkItems) ? dashboardDoc.homeworkItems : [],
  tuitionItems: Array.isArray(dashboardDoc?.tuitionItems) ? dashboardDoc.tuitionItems : [],
  isFallback: false,
});

const validateDashboardPayload = (dashboardData) => {
  const isValid =
    dashboardData &&
    Array.isArray(dashboardData.stats) &&
    Array.isArray(dashboardData.homeworkItems) &&
    Array.isArray(dashboardData.tuitionItems);

  if (!isValid) {
    throw createServiceError({
      code: 'validation/invalid-dashboard-payload',
      fallbackMessage: 'Dashboard data format is invalid.',
    });
  }
};

const upsertRoleDashboard = async ({ uid, role, dashboardData, isCreate = false }) => {
  validateDashboardPayload(dashboardData);
  const roleCollection = getRoleCollection(role);
  const ref = doc(db, roleCollection.collectionName, uid);

  const timestamps = {
    updatedAt: serverTimestamp(),
    ...(isCreate ? { createdAt: serverTimestamp() } : {}),
  };

  await setDoc(
    ref,
    {
      uid,
      role,
      ...dashboardData,
      ...timestamps,
    },
    { merge: true }
  );
};

const fetchRoleDashboard = async ({ uid, role }) => {
  const roleCollection = getRoleCollection(role);
  const ref = doc(db, roleCollection.collectionName, uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return toDashboardResponse(snapshot.data());
};

const createItem = ({ items, item, fallbackPrefix }) => {
  const nextItem = {
    ...item,
    id: item?.id || `${fallbackPrefix}-${Date.now()}`,
  };

  return [...items, nextItem];
};

const upsertCanonicalTuition = async ({ uid, item }) => {
  const tuitionId = item?.id || `tuition-${Date.now()}`;
  const normalizedStudentEmail = normalizeEmail(item?.studentEmail);

  await setDoc(
    getCanonicalTuitionRef(tuitionId),
    {
      ...item,
      id: tuitionId,
      teacherId: uid,
      studentId: String(item?.studentId || ''),
      studentEmail: normalizedStudentEmail,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return tuitionId;
};

const upsertCanonicalHomework = async ({ uid, item, studentEmail, studentId, studentName }) => {
  const homeworkId = item?.id || `hw-${Date.now()}`;

  await setDoc(
    getCanonicalHomeworkRef(homeworkId),
    {
      ...item,
      id: homeworkId,
      teacherId: uid,
      studentId: String(studentId || item?.studentId || ''),
      studentEmail: normalizeEmail(studentEmail || item?.studentEmail),
      studentName: studentName || item?.studentName || '',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return homeworkId;
};

const deleteCanonicalHomeworkByTuition = async (tuitionId) => {
  const homeworkQuery = query(collection(db, HOMEWORK_COLLECTION), where('tuitionId', '==', tuitionId));
  const homeworkSnapshot = await withDashboardRetry(() => getDocs(homeworkQuery));

  await Promise.all(homeworkSnapshot.docs.map((item) => deleteDoc(item.ref)));
};

const updateItem = ({ items, itemId, updates }) => {
  return items.map((item) => (item.id === itemId ? { ...item, ...updates, id: item.id } : item));
};

const deleteItem = ({ items, itemId }) => {
  return items.filter((item) => item.id !== itemId);
};

const mergeDashboardData = ({ primary, secondary, role }) => {
  const basePrimary =
    primary ||
    createRoleDashboardData({
      role,
      tuitionItems: [],
      homeworkItems: [],
    });

  if (!secondary) {
    return basePrimary;
  }

  const mergedTuitionItems = mergeItemsById(basePrimary.tuitionItems, secondary.tuitionItems);
  const mergedHomeworkItems = mergeItemsById(basePrimary.homeworkItems, secondary.homeworkItems);

  const stats =
    role === 'teacher'
      ? computeTeacherStats({ tuitionItems: mergedTuitionItems, homeworkItems: mergedHomeworkItems })
      : computeStudentStats({ tuitionItems: mergedTuitionItems, homeworkItems: mergedHomeworkItems });

  return {
    ...basePrimary,
    stats,
    tuitionItems: mergedTuitionItems,
    homeworkItems: mergedHomeworkItems,
    isFallback: false,
  };
};

const mutateDashboard = async ({ uid, role, mutate }) => {
  const current =
    (await fetchRoleDashboard({ uid, role })) ||
    createRoleDashboardData({
      role,
      tuitionItems: [],
      homeworkItems: [],
    });
  const next = mutate(current);
  validateDashboardPayload(next);
  await upsertRoleDashboard({ uid, role, dashboardData: next });
  return next;
};

const ensureUid = (uid) => {
  if (!uid) {
    throw createServiceError({
      code: 'validation/missing-user-id',
      fallbackMessage: 'Please sign in again to continue.',
    });
  }
};

const resolveStudentAssignment = async ({ studentEmail }) => {
  const normalizedStudentEmail = normalizeEmail(studentEmail);
  if (!normalizedStudentEmail) {
    return null;
  }

  const usersQuery = query(collection(db, USERS_COLLECTION), where('email', '==', normalizedStudentEmail));
  const usersSnapshot = await withDashboardRetry(() => getDocs(usersQuery));
  const studentDoc = usersSnapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .find((item) => item?.role === 'student');

  if (!studentDoc) {
    throw createServiceError({
      code: 'not-found',
      fallbackMessage: 'No student account found for this email.',
    });
  }

  return {
    studentId: studentDoc.uid || studentDoc.id,
    studentName: String(studentDoc.name || ''),
    studentEmail: normalizedStudentEmail,
  };
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

export const dashboardApi = {
  async fetchDashboardData({ uid, role, userRole, userEmail }) {
    try {
      ensureFirestore();
      ensureUid(uid);
      ensureRoleAccess({ userRole, requestedRole: role });

      const [dashboardData, canonicalData] = await Promise.all([
        withDashboardRetry(() => fetchRoleDashboard({ uid, role })),
        fetchCanonicalDashboardData({ uid, role, userEmail }).catch(() => null),
      ]);

      return mergeDashboardData({ primary: canonicalData || dashboardData, secondary: dashboardData, role });
    } catch (error) {
      throw normalizeFirebaseError(error, 'Failed to load dashboard data.');
    }
  },

  async saveDashboardData({ uid, role, userRole, dashboardData }) {
    try {
      ensureFirestore();
      ensureUid(uid);
      ensureRoleAccess({ userRole, requestedRole: role });

      await withDashboardRetry(() => upsertRoleDashboard({ uid, role, dashboardData }));
      return toDashboardResponse(dashboardData);
    } catch (error) {
      throw normalizeFirebaseError(error, 'Failed to save dashboard data.');
    }
  },

  async createHomeworkItem({ uid, role, userRole, item }) {
    try {
      ensureFirestore();
      ensureUid(uid);
      ensureRoleAccess({ userRole, requestedRole: role });
      ensureTeacherMutationAccess({ userRole });

      const currentDashboard =
        (await withDashboardRetry(() => fetchRoleDashboard({ uid, role }))) ||
        createRoleDashboardData({
          role,
          tuitionItems: [],
          homeworkItems: [],
        });
      const canonicalTargetSnapshot = await withDashboardRetry(() => getDoc(getCanonicalTuitionRef(item?.tuitionId)));
      const targetTuition = canonicalTargetSnapshot.exists()
        ? canonicalTargetSnapshot.data()
        : currentDashboard.tuitionItems.find((tuitionItem) => tuitionItem.id === item?.tuitionId);

      if (!targetTuition) {
        throw createServiceError({
          code: 'not-found',
          fallbackMessage: 'Selected tuition record was not found.',
        });
      }

      if (!normalizeEmail(targetTuition.studentEmail)) {
        throw createServiceError({
          code: 'validation/student-assignment-required',
          fallbackMessage: 'Please add a student to this tuition before assigning homework.',
        });
      }

      const normalizedItem = {
        ...item,
        id: item?.id || `hw-${Date.now()}`,
        studentId: String(targetTuition.studentId || ''),
        studentEmail: normalizeEmail(targetTuition.studentEmail),
        studentName: targetTuition.studentName || '',
        status: item?.status || 'pending',
      };

      await withDashboardRetry(() =>
        upsertCanonicalHomework({
          uid,
          item: normalizedItem,
          studentEmail: targetTuition.studentEmail,
          studentId: targetTuition.studentId,
          studentName: targetTuition.studentName,
        })
      );

      const nextDashboard = {
        ...currentDashboard,
        homeworkItems: createItem({
          items: currentDashboard.homeworkItems,
          item: normalizedItem,
          fallbackPrefix: 'hw',
        }),
      };

      await withDashboardRetry(() => upsertRoleDashboard({ uid, role, dashboardData: nextDashboard }));
      return nextDashboard;
    } catch (error) {
      throw normalizeFirebaseError(error, 'Failed to create homework item.');
    }
  },

  async updateHomeworkItem({ uid, role, userRole, itemId, updates }) {
    try {
      ensureFirestore();
      ensureUid(uid);
      ensureRoleAccess({ userRole, requestedRole: role });
      ensureTeacherMutationAccess({ userRole });

      const canonicalHomeworkSnapshot = await withDashboardRetry(() => getDoc(getCanonicalHomeworkRef(itemId)));
      if (canonicalHomeworkSnapshot.exists()) {
        const previous = canonicalHomeworkSnapshot.data();
        await withDashboardRetry(() =>
          upsertCanonicalHomework({
            uid,
            item: {
              ...previous,
              ...updates,
              id: itemId,
            },
            studentEmail: updates?.studentEmail || previous?.studentEmail,
            studentId: updates?.studentId || previous?.studentId,
            studentName: updates?.studentName || previous?.studentName,
          })
        );
      }

      return await withDashboardRetry(() =>
        mutateDashboard({
          uid,
          role,
          mutate: (data) => ({
            ...data,
            homeworkItems: updateItem({ items: data.homeworkItems, itemId, updates }),
          }),
        })
      );
    } catch (error) {
      throw normalizeFirebaseError(error, 'Failed to update homework item.');
    }
  },

  async deleteHomeworkItem({ uid, role, userRole, itemId }) {
    try {
      ensureFirestore();
      ensureUid(uid);
      ensureRoleAccess({ userRole, requestedRole: role });
      ensureTeacherMutationAccess({ userRole });

      await withDashboardRetry(() => deleteDoc(getCanonicalHomeworkRef(itemId))).catch(() => null);

      return await withDashboardRetry(() =>
        mutateDashboard({
          uid,
          role,
          mutate: (data) => ({
            ...data,
            homeworkItems: deleteItem({ items: data.homeworkItems, itemId }),
          }),
        })
      );
    } catch (error) {
      throw normalizeFirebaseError(error, 'Failed to delete homework item.');
    }
  },

  async createTuitionItem({ uid, role, userRole, item }) {
    try {
      ensureFirestore();
      ensureUid(uid);
      ensureRoleAccess({ userRole, requestedRole: role });
      ensureTeacherMutationAccess({ userRole });

      const normalizedItem = {
        ...item,
        id: item?.id || `tuition-${Date.now()}`,
        studentId: String(item?.studentId || ''),
        studentEmail: normalizeEmail(item?.studentEmail),
      };

      await withDashboardRetry(() => upsertCanonicalTuition({ uid, item: normalizedItem }));

      return await withDashboardRetry(() =>
        mutateDashboard({
          uid,
          role,
          mutate: (data) => ({
            ...data,
            tuitionItems: createItem({ items: data.tuitionItems, item: normalizedItem, fallbackPrefix: 'tuition' }),
          }),
        })
      );
    } catch (error) {
      throw normalizeFirebaseError(error, 'Failed to create tuition item.');
    }
  },

  async updateTuitionItem({ uid, role, userRole, itemId, updates }) {
    try {
      ensureFirestore();
      ensureUid(uid);
      ensureRoleAccess({ userRole, requestedRole: role });
      ensureTeacherMutationAccess({ userRole });

      if (updates?.studentEmail !== undefined) {
        const normalizedStudentEmail = normalizeEmail(updates.studentEmail);

        if (normalizedStudentEmail && !isValidEmail(normalizedStudentEmail)) {
          throw createServiceError({
            code: 'validation/invalid-student-email',
            fallbackMessage: 'Please provide a valid student email address.',
          });
        }
      }

      const normalizedUpdates = {
        ...updates,
        ...(updates?.studentEmail !== undefined ? { studentEmail: normalizeEmail(updates.studentEmail) } : {}),
      };

      if (updates?.studentEmail !== undefined) {
        if (!normalizedUpdates.studentEmail) {
          normalizedUpdates.studentId = '';
          normalizedUpdates.studentName = updates?.studentName !== undefined ? updates.studentName : '';
        } else {
          const resolvedStudent = await resolveStudentAssignment({ studentEmail: normalizedUpdates.studentEmail });
          normalizedUpdates.studentId = resolvedStudent.studentId;
          if (updates?.studentName === undefined) {
            normalizedUpdates.studentName = resolvedStudent.studentName;
          }
        }
      }

      const canonicalTuitionSnapshot = await withDashboardRetry(() => getDoc(getCanonicalTuitionRef(itemId)));
      if (canonicalTuitionSnapshot.exists()) {
        const previous = canonicalTuitionSnapshot.data();

        await withDashboardRetry(() =>
          upsertCanonicalTuition({
            uid,
            item: {
              ...previous,
              ...normalizedUpdates,
              id: itemId,
            },
          })
        );

        if (normalizedUpdates?.studentEmail !== undefined || normalizedUpdates?.studentName !== undefined) {
          const relatedHomeworkQuery = query(collection(db, HOMEWORK_COLLECTION), where('tuitionId', '==', itemId));
          const relatedHomeworkSnapshot = await withDashboardRetry(() => getDocs(relatedHomeworkQuery));

          await Promise.all(
            relatedHomeworkSnapshot.docs.map((homeworkDoc) =>
              withDashboardRetry(() =>
                upsertCanonicalHomework({
                  uid,
                  item: {
                    ...homeworkDoc.data(),
                    id: homeworkDoc.id,
                    studentEmail:
                      normalizedUpdates?.studentEmail !== undefined
                        ? normalizedUpdates.studentEmail
                        : homeworkDoc.data()?.studentEmail,
                    studentId:
                      normalizedUpdates?.studentId !== undefined
                        ? normalizedUpdates.studentId
                        : homeworkDoc.data()?.studentId,
                    studentName:
                      normalizedUpdates?.studentName !== undefined
                        ? normalizedUpdates.studentName
                        : homeworkDoc.data()?.studentName,
                  },
                  studentEmail:
                    normalizedUpdates?.studentEmail !== undefined
                      ? normalizedUpdates.studentEmail
                      : homeworkDoc.data()?.studentEmail,
                  studentId:
                    normalizedUpdates?.studentId !== undefined
                      ? normalizedUpdates.studentId
                      : homeworkDoc.data()?.studentId,
                  studentName:
                    normalizedUpdates?.studentName !== undefined
                      ? normalizedUpdates.studentName
                      : homeworkDoc.data()?.studentName,
                })
              )
            )
          );
        }
      }

      return await withDashboardRetry(() =>
        mutateDashboard({
          uid,
          role,
          mutate: (data) => ({
            ...data,
            tuitionItems: updateItem({ items: data.tuitionItems, itemId, updates: normalizedUpdates }),
          }),
        })
      );
    } catch (error) {
      throw normalizeFirebaseError(error, 'Failed to update tuition item.');
    }
  },

  async deleteTuitionItem({ uid, role, userRole, itemId }) {
    try {
      ensureFirestore();
      ensureUid(uid);
      ensureRoleAccess({ userRole, requestedRole: role });
      ensureTeacherMutationAccess({ userRole });

      await withDashboardRetry(() => deleteDoc(getCanonicalTuitionRef(itemId))).catch(() => null);
      await deleteCanonicalHomeworkByTuition(itemId).catch(() => null);

      return await withDashboardRetry(() =>
        mutateDashboard({
          uid,
          role,
          mutate: (data) => ({
            ...data,
            tuitionItems: deleteItem({ items: data.tuitionItems, itemId }),
          }),
        })
      );
    } catch (error) {
      throw normalizeFirebaseError(error, 'Failed to delete tuition item.');
    }
  },

  async listRoleDashboards({ role, userRole }) {
    try {
      ensureFirestore();
      ensureRoleAccess({ userRole, requestedRole: role });

      const roleCollection = getRoleCollection(role);
      const dashboardsRef = collection(db, roleCollection.collectionName);
      const snapshot = await withDashboardRetry(() => getDocs(query(dashboardsRef)));

      return snapshot.docs.map((item) => ({ uid: item.id, ...toDashboardResponse(item.data()) }));
    } catch (error) {
      throw normalizeFirebaseError(error, 'Failed to list dashboard records.');
    }
  },
};
