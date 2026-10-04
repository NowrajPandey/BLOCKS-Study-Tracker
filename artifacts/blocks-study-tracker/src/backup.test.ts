import {describe,expect,it} from 'vitest';
import {BACKUP_REMINDER_DAYS,REMIND_COOLDOWN_MS,SNAPSHOT_INTERVAL_MS,daysBetweenMs,isBackupOverdue,shouldRemind,shouldSnapshot} from './backup';

const DAY=86_400_000;
const NOW=1_800_000_000_000;

describe('automatic snapshots',()=>{
 it('waits for the snapshot interval before writing again',()=>{
  expect(shouldSnapshot(NOW-SNAPSHOT_INTERVAL_MS,NOW)).toBe(true);
  expect(shouldSnapshot(NOW-SNAPSHOT_INTERVAL_MS+1,NOW)).toBe(false);
  expect(shouldSnapshot(NOW-SNAPSHOT_INTERVAL_MS-1,NOW)).toBe(true);
 });

 it('snapshots immediately the first time',()=>{
  expect(shouldSnapshot(0,NOW)).toBe(true);
 });
});

describe('backup reminders',()=>{
 it('counts whole days between two stamps',()=>{
  expect(daysBetweenMs(NOW-3*DAY,NOW)).toBe(3);
  expect(daysBetweenMs(NOW,NOW)).toBe(0);
 });

 it('becomes overdue only at the reminder threshold',()=>{
  expect(isBackupOverdue(NOW-(BACKUP_REMINDER_DAYS-1)*DAY,NOW)).toBe(false);
  expect(isBackupOverdue(NOW-BACKUP_REMINDER_DAYS*DAY,NOW)).toBe(true);
 });

 it('respects the dismiss cooldown',()=>{
  const overdue=NOW-BACKUP_REMINDER_DAYS*DAY;
  expect(shouldRemind(overdue,NOW,0)).toBe(true);
  expect(shouldRemind(overdue,NOW,NOW-REMIND_COOLDOWN_MS+1)).toBe(false);
  expect(shouldRemind(overdue,NOW,NOW-REMIND_COOLDOWN_MS)).toBe(true);
 });

 it('never reminds while a backup is fresh',()=>{
  expect(shouldRemind(NOW-DAY,NOW,0)).toBe(false);
 });
});
