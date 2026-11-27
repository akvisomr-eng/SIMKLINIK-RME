
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  CalendarClock,
  ClipboardList,
  Fingerprint,
  FolderHeart,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
  Wallet,
} from 'lucide-react-native';
import { OFFLINE_FALLBACK_BOOTSTRAP } from './src/data/clinicalCatalogs';
import {
  DEFAULT_EMPLOYEE_NUMBER,
  fetchClinicalBootstrap,
  submitClinicalAssessment,
  submitClinicalSoap,
  submitInterprofessionalReferral,
  submitPpiOrIncidentLog,
} from './src/services/rmeSyncService';
import { changePin, loginWithPin } from './src/services/authService';
import { ActiveSessionScreen } from './src/screens/ActiveSessionScreen';
import { AgendaScreen } from './src/screens/AgendaScreen';
import { AssessmentScreen } from './src/screens/AssessmentScreen';
import { ComplianceScreen } from './src/screens/ComplianceScreen';
import { DataManagerScreen } from './src/screens/DataManagerScreen';
import { PatientsRmeScreen } from './src/screens/PatientsRmeScreen';
import { AppointmentItem, BootstrapClinicalData } from './src/types/clinical';
import { getSipDaysRemaining } from './src/utils/clinicalFormatters';

type BottomTab =
  | 'AGENDA'
  | 'ASESMEN'
  | 'SESI_SOAP'
  | 'RME_PASIEN'
  | 'OPERASIONAL'
  | 'KEPATUHAN';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState(DEFAULT_EMPLOYEE_NUMBER);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState<'LOGIN' | 'GANTI'>('LOGIN');
  const [newPin, setNewPin] = useState('');

  const [currentTab, setCurrentTab] = useState<BottomTab>('AGENDA');
  const [clinicalData, setClinicalData] = useState<BootstrapClinicalData>(
    OFFLINE_FALLBACK_BOOTSTRAP
  );
  const [syncSource, setSyncSource] = useState<
    'CLOUD_SUPABASE_RME' | 'ENCRYPTED_LOCAL_CACHE'
  >('ENCRYPTED_LOCAL_CACHE');
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [offlineMode, setOfflineMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    OFFLINE_FALLBACK_BOOTSTRAP.patients[0]?.id ?? ''
  );
  const [activeAppointment, setActiveAppointment] = useState<AppointmentItem | null>(
    null
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const loadData = useCallback(
    async (forceOfflineFlag: boolean = offlineMode) => {
      setLoading(true);
      try {
        const res = await fetchClinicalBootstrap(employeeNumber, forceOfflineFlag);
        setClinicalData(res.data);
        setSyncSource(res.source);
        setPendingQueueCount(res.pendingQueueCount);
        if (res.data.patients.length > 0 && !selectedPatientId) {
          setSelectedPatientId(res.data.patients[0].id);
        }
      } finally {
        setLoading(false);
      }
    },
    [employeeNumber, offlineMode, selectedPatientId]
  );

  const handleLogin = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      if (pinMode === 'GANTI') {
        if (newPin.trim().length < 6) {
          setAuthError('PIN baru minimal 6 angka.');
          return;
        }
        const res = await changePin(employeeNumber, pinInput, newPin);
        if (!res.ok) {
          setAuthError(res.message);
          return;
        }
        setAuthError(null);
        showToast(res.message);
        setPinMode('LOGIN');
        setPinInput('');
        setNewPin('');
        return;
      }

      const res = await loginWithPin(employeeNumber, pinInput);
      if (!res.ok) {
        setAuthError(res.message);
        return;
      }
      setAuthenticated(true);
      setPinInput('');
      await loadData(offlineMode);
    } finally {
      setAuthBusy(false);
    }
  };

  useEffect(() => {
    if (authenticated) loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const sipDaysLeft = getSipDaysRemaining(clinicalData.therapist.sip_valid_until);
  const isSipExpired = sipDaysLeft <= 0;

  if (!authenticated) {
    return (
      <SafeAreaView style={styles.authRoot}>
        <StatusBar style="light" />
        <View style={styles.authCard}>
          <View style={styles.authBadgeRow}>
            <ShieldCheck size={22} color="#2A8871" />
            <Text style={styles.authAppTitle}>WicaraSehat Terapis Android</Text>
          </View>
          <Text style={styles.authSubtitle}>
            Point-of-Care Rekam Medis Elektronik Terapi Wicara • Patuh UU Kesehatan No. 17/2023, Permenkes 24/2022, Permenkes 81/2014 & UU PDP
          </Text>

          <Text style={styles.authLabel}>ID Pegawai / Terapis Wicara:</Text>
          <TextInput
            value={employeeNumber}
            onChangeText={setEmployeeNumber}
            autoCapitalize="characters"
            style={styles.authInput}
          />

          <Text style={styles.authLabel}>
            {pinMode === 'LOGIN' ? 'PIN Sesi Klinis RME:' : 'PIN Lama:'}
          </Text>
          <TextInput
            value={pinInput}
            onChangeText={setPinInput}
            secureTextEntry
            keyboardType="numeric"
            placeholder="6-8 angka"
            placeholderTextColor="#7E93A3"
            style={styles.authInput}
          />

          {pinMode === 'GANTI' && (
            <>
              <Text style={styles.authLabel}>PIN Baru:</Text>
              <TextInput
                value={newPin}
                onChangeText={setNewPin}
                secureTextEntry
                keyboardType="numeric"
                placeholder="6-8 angka"
                placeholderTextColor="#7E93A3"
                style={styles.authInput}
              />
            </>
          )}

          {authError && (
            <View style={styles.authErrorBox}>
              <Text style={styles.authErrorText}>{authError}</Text>
            </View>
          )}

          <Pressable onPress={handleLogin} style={styles.biometricBtn} disabled={authBusy}>
            {authBusy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Fingerprint size={18} color="#FFFFFF" />
                <Text style={styles.biometricBtnText}>
                  {pinMode === 'LOGIN'
                    ? 'Masuk dengan PIN Sesi Klinis'
                    : 'Simpan PIN Baru'}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setPinMode(pinMode === 'LOGIN' ? 'GANTI' : 'LOGIN');
              setAuthError(null);
            }}
            style={styles.authSwitch}
          >
            <Text style={styles.authSwitchText}>
              {pinMode === 'LOGIN' ? 'Ganti PIN sesi' : 'Kembali ke halaman masuk'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.appOuter}>
      <StatusBar style="light" />
      <View style={styles.deviceShell}>
        <View style={styles.topAppBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.appBarSuper}>
              MODUL ANDROID TERAPIS WICARA • FASYANKES {clinicalData.clinic.fasyankes_code}
            </Text>
            <Text style={styles.appBarTitle} numberOfLines={1}>
              WicaraSehat Clinical Point-of-Care
            </Text>
          </View>

          <Pressable
            onPress={() => {
              setAuthenticated(false);
              setCurrentTab('AGENDA');
            }}
            style={styles.lockSessionBtn}
          >
            <LockKeyhole size={14} color="#DCEFE7" />
            <Text style={styles.lockSessionText}>Kunci Sesi</Text>
          </Pressable>
        </View>

        {isSipExpired && (
          <View style={styles.sipBlockedBar}>
            <Text style={styles.sipBlockedText}>
              SIP Kedaluwarsa! Hak pengisian tindakan klinis dikunci otomatis sesuai UU No. 17/2023.
            </Text>
          </View>
        )}

        {toastMessage && (
          <View style={styles.toastBanner}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        <View style={styles.mainViewport}>
          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#1E6B57" />
              <Text style={styles.loaderText}>
                Menyinkronkan Rekam Medis Elektronik & Kredensial SIP...
              </Text>
            </View>
          ) : (
            <>
              {currentTab === 'AGENDA' && (
                <AgendaScreen
                  clinic={clinicalData.clinic}
                  therapist={clinicalData.therapist}
                  rooms={clinicalData.rooms}
                  appointments={clinicalData.appointments}
                  patients={clinicalData.patients}
                  syncSource={syncSource}
                  pendingQueueCount={pendingQueueCount}
                  offlineMode={offlineMode}
                  onToggleOffline={() => {
                    const next = !offlineMode;
                    setOfflineMode(next);
                    showToast(
                      next
                        ? 'Mode Ruang Kedap Suara (Offline-First) diaktifkan.'
                        : 'Kembali ke Mode Sinkronisasi Cloud RME.'
                    );
                  }}
                  onRefreshSync={() => loadData(offlineMode)}
                  onStartSession={(appt) => {
                    setActiveAppointment(appt);
                    setSelectedPatientId(appt.patient_id);
                    setCurrentTab('SESI_SOAP');
                  }}
                  onOpenAssessment={(patientId) => {
                    setSelectedPatientId(patientId);
                    setCurrentTab('ASESMEN');
                  }}
                />
              )}

              {currentTab === 'ASESMEN' && (
                <AssessmentScreen
                  patients={clinicalData.patients}
                  selectedPatientId={selectedPatientId}
                  therapist={clinicalData.therapist}
                  onSelectPatient={setSelectedPatientId}
                  onSubmitAssessment={async (payload) => {
                    const res = await submitClinicalAssessment(payload, offlineMode);
                    showToast(res.message);
                    await loadData(offlineMode);
                  }}
                />
              )}

              {currentTab === 'SESI_SOAP' && (
                <ActiveSessionScreen
                  patients={clinicalData.patients}
                  carePlans={clinicalData.care_plans}
                  soapHistory={clinicalData.soap_sessions}
                  activeAppointment={activeAppointment}
                  selectedPatientId={selectedPatientId}
                  therapist={clinicalData.therapist}
                  onSelectPatient={(id) => {
                    setActiveAppointment(null);
                    setSelectedPatientId(id);
                  }}
                  onSubmitSoap={async (payload) => {
                    const res = await submitClinicalSoap(payload, offlineMode);
                    showToast(res.message);
                    await loadData(offlineMode);
                  }}
                />
              )}

              {currentTab === 'RME_PASIEN' && (
                <PatientsRmeScreen
                  patients={clinicalData.patients}
                  carePlans={clinicalData.care_plans}
                  soapSessions={clinicalData.soap_sessions}
                  therapist={clinicalData.therapist}
                  onOpenAssessment={(ptId) => {
                    setSelectedPatientId(ptId);
                    setCurrentTab('ASESMEN');
                  }}
                  onOpenSoap={(ptId) => {
                    setActiveAppointment(null);
                    setSelectedPatientId(ptId);
                    setCurrentTab('SESI_SOAP');
                  }}
                  onSubmitReferral={async (payload) => {
                    const res = await submitInterprofessionalReferral(
                      payload,
                      offlineMode
                    );
                    showToast(res.message);
                  }}
                />
              )}

              {currentTab === 'OPERASIONAL' && (
                <DataManagerScreen
                  therapist={clinicalData.therapist}
                  patients={clinicalData.patients}
                  onDataChanged={() => loadData(offlineMode)}
                />
              )}

              {currentTab === 'KEPATUHAN' && (
                <ComplianceScreen
                  therapist={clinicalData.therapist}
                  rooms={clinicalData.rooms}
                  patients={clinicalData.patients}
                  sops={clinicalData.sops}
                  sterilizationLogs={clinicalData.sterilization_logs}
                  auditLogs={clinicalData.audit_logs}
                  onSubmitPpiOrIkp={async (payload) => {
                    const res = await submitPpiOrIncidentLog(payload, offlineMode);
                    showToast(res.message);
                    await loadData(offlineMode);
                  }}
                />
              )}
            </>
          )}
        </View>

        <View style={styles.bottomNav}>
          {[
            { id: 'AGENDA' as const, label: 'Jadwal', Icon: CalendarClock },
            { id: 'ASESMEN' as const, label: 'Asesmen', Icon: Stethoscope },
            { id: 'SESI_SOAP' as const, label: 'Terapi', Icon: ClipboardList },
            { id: 'RME_PASIEN' as const, label: 'RME', Icon: FolderHeart },
            { id: 'OPERASIONAL' as const, label: 'Operasional', Icon: Wallet },
            { id: 'KEPATUHAN' as const, label: 'Mutu', Icon: ShieldCheck },
          ].map(({ id, label, Icon }) => {
            const active = currentTab === id;
            return (
              <Pressable
                key={id}
                onPress={() => setCurrentTab(id)}
                style={styles.navTab}
              >
                <View style={[styles.navIconPill, active && styles.navIconPillActive]}>
                  <Icon size={17} color={active ? '#1E6B57' : '#5A7285'} />
                </View>
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  authRoot: {
    flex: 1,
    backgroundColor: '#0A1F2E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#103F35',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#24435A',
  },
  authBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  authAppTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  authSubtitle: { color: '#AFC6BF', fontSize: 12, lineHeight: 18, marginBottom: 16 },
  authLabel: {
    color: '#DCD7CD',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 5,
  },
  authInput: {
    backgroundColor: '#0A1F2E',
    borderWidth: 1,
    borderColor: '#3C5D57',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  authErrorBox: {
    marginTop: 12,
    backgroundColor: '#8C2F22',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  authErrorText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' },
  biometricBtn: {
    marginTop: 18,
    backgroundColor: '#1E6B57',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  biometricBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  authSwitch: { marginTop: 12, alignItems: 'center' },
  authSwitchText: { color: '#9FD3C2', fontSize: 11.5, fontWeight: '700' },
  appOuter: {
    flex: 1,
    backgroundColor: '#0A1F2E',
    alignItems: 'center',
  },
  deviceShell: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 520 : undefined,
    backgroundColor: '#F6F4EF',
    overflow: 'hidden',
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: '#24435A',
  },
  topAppBar: {
    backgroundColor: '#103F35',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  appBarSuper: {
    color: '#AFC6BF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  appBarTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 1,
  },
  lockSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(10, 31, 46, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  lockSessionText: { color: '#DCEFE7', fontSize: 11, fontWeight: '700' },
  sipBlockedBar: {
    backgroundColor: '#8C2F22',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sipBlockedText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  toastBanner: {
    backgroundColor: '#174F38',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  toastText: { color: '#E3F2EA', fontSize: 12, fontWeight: '700' },
  mainViewport: { flex: 1 },
  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: '#24435A',
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E0D8',
    paddingVertical: 7,
    paddingHorizontal: 2,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  navIconPillActive: {
    backgroundColor: '#DCEFE7',
  },
  navLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5A7285',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#1E6B57',
    fontWeight: '800',
  },
});
