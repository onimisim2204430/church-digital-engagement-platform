#!/usr/bin/env python
"""
Celery Continuous Monitor
Usage: python monitor_celery.py
Runs continuously, alerts if worker crashes
"""

import os
import sys
import time
import redis
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from celery.app.control import Inspect
from config.celery import app

class CeleryMonitor:
    def __init__(self):
        self.redis_conn = redis.Redis(host='localhost', port=6379, db=0, socket_connect_timeout=2)
        self.worker_down = False
        self.last_alert_time = 0
        self.last_queue_size = 0
        
    def is_worker_running(self):
        """Check if Celery worker is responding"""
        try:
            inspector = Inspect(app=app)
            stats = inspector.stats()
            return stats is not None and len(stats) > 0
        except:
            return False
    
    def alert_worker_down(self):
        """Alert when worker goes down"""
        current_time = time.time()
        # Only alert once per 5 minutes to avoid spam
        if current_time - self.last_alert_time > 300:
            print("\n" + "⚠"*40)
            print("CRITICAL ALERT: Celery worker DOWN!")
            print("="*80)
            print("Payment withdrawals WILL NOT PROCESS!")
            print("Tasks queue up but don't get executed.")
            print("")
            print("ACTION REQUIRED:")
            print("  1. Ensure Redis is running")
            print("  2. Start Celery worker:")
            print("     celery -A config worker -l info --pool=threads")
            print("")
            print("After restart, tasks will resume.")
            print("="*80)
            print("⚠"*40 + "\n")
            self.last_alert_time = current_time
    
    def get_queue_stats(self):
        """Get queue statistics"""
        try:
            celery_queue_len = self.redis_conn.llen('celery')
            return celery_queue_len
        except:
            return 0
    
    def get_active_tasks(self):
        """Get count of active tasks"""
        try:
            inspector = Inspect(app=app)
            active = inspector.active()
            if active:
                return sum(len(tasks) for tasks in active.values())
            return 0
        except:
            return 0
    
    def monitor(self, check_interval=10):
        """Monitor Celery status continuously"""
        print("\n" + "="*80)
        print("CELERY MONITOR - Running")
        print("="*80)
        print("Checking every {} seconds | Press Ctrl+C to exit".format(check_interval))
        print("="*80 + "\n")
        
        last_print = 0
        header_interval = 60  # Print header every 60 seconds
        
        try:
            while True:
                current_time = time.time()
                is_running = self.is_worker_running()
                queue_len = self.get_queue_stats()
                active_count = self.get_active_tasks()
                timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
                
                # Print header periodically
                if current_time - last_print > header_interval:
                    print("[TIME]              [STATUS]  [QUEUE] [ACTIVE] [NOTES]")
                    last_print = current_time
                
                if is_running:
                    status_str = "✓ RUNNING"
                    
                    # Show queue and active task info
                    if queue_len > 0:
                        queue_str = f"{queue_len:>6}"
                        notes = "Processing..."
                    else:
                        queue_str = "  0   "
                        notes = "Idle"
                    
                    active_str = f"{active_count:>6}"
                    
                    print(f"[{timestamp}] {status_str}  {queue_str} {active_str}  {notes}")
                    
                    self.worker_down = False
                else:
                    status_str = "✗ DOWN"
                    print(f"[{timestamp}] {status_str}  {queue_len:>6} {0:>6}  CRITICAL!")
                    if not self.worker_down:
                        self.worker_down = True
                        self.alert_worker_down()
                
                time.sleep(check_interval)
                
        except KeyboardInterrupt:
            print("\n\nMonitoring stopped by user")
            sys.exit(0)
        except redis.ConnectionError:
            print("\nRedis connection error - is Redis running?")
            print("Start Redis: redis-server")
            sys.exit(1)
        except Exception as e:
            print(f"\nMonitor error: {e}")
            sys.exit(1)

if __name__ == '__main__':
    monitor = CeleryMonitor()
    monitor.monitor(check_interval=10)
