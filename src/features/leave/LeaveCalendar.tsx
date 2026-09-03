import React, { useMemo, useState } from 'react';
import { Calendar, momentLocalizer, Views, ToolbarProps, Navigate } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/id';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { LeaveRequest } from '../../api/leave';


moment.locale('id');
const localizer = momentLocalizer(moment);

interface LeaveCalendarProps {
  requests: LeaveRequest[];
  onSelectEvent: (request: LeaveRequest) => void;
}


const CustomToolbar = (toolbar: ToolbarProps) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={() => toolbar.onNavigate(Navigate.TODAY)} 
          style={{ padding: '6px 16px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
        >
          Today
        </button>
        <button 
          onClick={() => toolbar.onNavigate(Navigate.PREVIOUS)} 
          style={{ padding: '6px 12px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', borderRadius: '6px', cursor: 'pointer' }}
        >
          &lt;
        </button>
        <button 
          onClick={() => toolbar.onNavigate(Navigate.NEXT)} 
          style={{ padding: '6px 12px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', borderRadius: '6px', cursor: 'pointer' }}
        >
          &gt;
        </button>
      </div>
      
      <div style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>
        {toolbar.label}
      </div>

      <div style={{ width: '130px' }}></div>
    </div>
  );
};


const getEventStyle = (status: string) => {
  switch (status) {
    case 'approved': return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
    case 'rejected': return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
    case 'cancelled': return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    default: return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
  }
};

export function LeaveCalendar({ requests, onSelectEvent }: LeaveCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const parsePlainDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    return new Date(dateStr.split('T')[0] + 'T00:00:00');
  };

  const events = useMemo(() => requests.map(req => {
    const end = parsePlainDate(req.end_date);
    end.setHours(23, 59, 59);

    return {
      id: req.id,
      title: `${req.employee_name} - ${req.leave_type_name}`,
      start: parsePlainDate(req.start_date),
      end,
      allDay: true,
      resource: req,
    };
  }), [requests]);


  const eventStyleGetter = (event: any) => {
    const req = event.resource as LeaveRequest;
    const style = getEventStyle(req.status);

    return {
      style: {
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: '4px',
        fontWeight: 600,
        fontSize: '12px',
        padding: '2px 4px',
        display: 'block'
      }
    };
  };

  return (
    <div style={{ height: '700px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%' }}>
      <Calendar
        localizer={localizer}
        events={events}
        date={currentDate}
        onNavigate={setCurrentDate}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={(e: any) => onSelectEvent(e.resource)}
        eventPropGetter={eventStyleGetter}
        components={{ toolbar: CustomToolbar }}
        views={[Views.MONTH]}
        defaultView={Views.MONTH}
        messages={{
          noEventsInRange: "Tidak ada pengajuan cuti.",
          showMore: (total: number) => `+ ${total} lagi`
        }}
      />
    </div>
  );
}
