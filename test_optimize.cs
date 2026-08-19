using System;
using System.Collections.Generic;
using System.Linq;

public class Program {
    public static void Main() {
        var shifts = new List<(TimeSpan Start, TimeSpan End)> {
            (TimeSpan.FromHours(8), TimeSpan.FromHours(16)),
            (TimeSpan.FromHours(16), TimeSpan.FromHours(24))
        };

        DateTime cursor = DateTime.Today.AddHours(0); // 00:00
        
        bool inside = false;
        TimeSpan? earliest = null;
        
        foreach (var s in shifts) {
            if (cursor.TimeOfDay >= s.Start && cursor.TimeOfDay < s.End) {
                inside = true;
                break;
            }
            if (cursor.TimeOfDay < s.Start) {
                if (!earliest.HasValue || s.Start < earliest.Value) earliest = s.Start;
            }
        }
        
        Console.WriteLine($"00:00 -> Inside: {inside}, Earliest: {earliest}");
        
        cursor = DateTime.Today.AddHours(23).AddMinutes(59).AddSeconds(59);
        inside = false; earliest = null;
        foreach (var s in shifts) {
            if (cursor.TimeOfDay >= s.Start && cursor.TimeOfDay < s.End) {
                inside = true;
                break;
            }
            if (cursor.TimeOfDay < s.Start) {
                if (!earliest.HasValue || s.Start < earliest.Value) earliest = s.Start;
            }
        }
        Console.WriteLine($"23:59:59 -> Inside: {inside}, Earliest: {earliest}");
    }
}
