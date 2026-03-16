import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ModalShell({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
  closeOnBackdrop = true,
  animationType = 'fade',
}) {
  return (
    <Modal visible={visible} transparent animationType={animationType} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable
          style={styles.backdrop}
          onPress={closeOnBackdrop ? onClose : undefined}
          accessibilityRole="button"
          accessibilityLabel="Close modal"
        />
        <View style={styles.modalCard}>
          <View style={styles.header}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {onClose ? (
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Text style={styles.closeLabel}>Close</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '88%',
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  closeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  body: {
    paddingTop: 14,
  },
  footer: {
    marginTop: 16,
  },
  pressed: {
    opacity: 0.75,
  },
});
