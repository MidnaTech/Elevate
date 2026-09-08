/* Source-backed teaching content from the supplied DOCX.
 * Source administrator routing, pass marks and retry limits are intentionally absent:
 * the agreed application coaching policy remains authoritative.
 * Video scripts and production notes are reference material. Each level's `media` entry
 * points at the delivered captioned video, poster and WebVTT track under dist/media/.
 */
globalThis.SpeedingCoursePack = {
  "source": {
    "filename": "Heavy_Truck_Speeding_Three_Level_Course_Pack.docx",
    "title": "Heavy-truck speeding — Three levels. A stronger driving habit.",
    "version": "1.0",
    "date": "2026-09-07",
    "mediaStatus": "rendered",
    "mediaNote": "Captioned course videos, posters and WebVTT tracks delivered September 8, 2026; see dist/media/courses/speeding/manifest.json."
  },
  "summary": "Level 1: reset the habit. Level 2: understand the risk. Level 3: demonstrate safer judgment under pressure.",
  "audience": "Designed for licensed heavy-duty truck drivers, with a recurring tractor-trailer example and a shared Canadian/U.S. safety core. The learning becomes more demanding through realistic choices, a specific action plan and coach follow-up.",
  "timingNote": "*Course-time estimates include reading, quiz and reflection; validate with a driver pilot. Video timings are exact authoring targets, pending recorded narration.",
  "levels": [
    {
      "id": "speeding-course-1",
      "level": 1,
      "title": "Reset your speed",
      "summary": "Extra speed uses up the space and time you need when traffic or road conditions change. In a heavy truck, a small correction made early can prevent an urgent decision later.",
      "tagline": "Check. Ease off. Protect space.",
      "videoSeconds": 60,
      "media": {
        "videoUrl": "media/courses/speeding/speeding-level-1.mp4",
        "posterUrl": "media/courses/speeding/speeding-level-1.jpg",
        "captionsUrl": "media/courses/speeding/speeding-level-1.vtt",
        "resolution": "2560x1440",
        "narrator": "Emily",
        "captionsBurnedIn": true
      },
      "estimatedDuration": "3–4 min",
      "learningGoal": "Check limits and conditions; adjust early; restore space.",
      "lesson": [
        {
          "heading": "Check the limit and the road",
          "body": "Stay within the applicable legal limit and any lower vehicle or fleet limit. Rain, short sight distance, traffic, curves or a downgrade may require a lower speed. A limiter does not tell you whether a speed suits the road."
        },
        {
          "heading": "Ease off before the change",
          "body": "Look for lower speed limits, brake lights, curves and work zones. Begin slowing early and smoothly so you reach the lower speed before the new limit or hazard. Keep scanning the road and mirrors; avoid staring at the speedometer."
        },
        {
          "heading": "Protect the space ahead",
          "body": "Leave room to respond and brake. Increase following space as conditions worsen, using your fleet's approved guidance for the vehicle and conditions. If someone enters your gap, rebuild it smoothly when safe."
        },
        {
          "heading": "Use this on your next trip",
          "body": "Choose one cue: a new speed-limit sign, an approaching curve, or changing weather. When you see it, check your speed and adjust early. If the trip is delayed, update dispatch only after parking safely."
        }
      ],
      "commitment": {
        "title": "Your next-trip commitment",
        "prompt": "On my next trip, when I approach a lower limit or changing conditions, I will check my speed, ease off early, and protect the space ahead.",
        "instruction": "Select a practical commitment."
      },
      "questions": [
        {
          "id": "L1-Q1",
          "prompt": "Rain is reducing visibility. You are at the posted limit and cars are passing. What is the best choice?",
          "options": [
            "Keep the posted speed because you are within the legal limit.",
            "Reduce speed for visibility and traction, and increase following space.",
            "Match the passing cars so traffic stays together."
          ],
          "correctIndex": 1,
          "feedback": [
            "A posted maximum does not establish a safe speed for poor visibility or a slippery road.",
            "Correct. Choose a speed and gap that fit current conditions while staying within applicable limits.",
            "Other vehicles do not set a safe speed for your truck, load or stopping needs."
          ],
          "explanation": "Correct. Choose a speed and gap that fit current conditions while staying within applicable limits.",
          "critical": true,
          "remediation": "Review 'Check the limit and the road' and video scene 2."
        },
        {
          "id": "L1-Q2",
          "prompt": "You see a lower speed-limit sign ahead. You have room to slow smoothly. When should you adjust?",
          "options": [
            "Once you pass the sign, then begin slowing.",
            "Wait for the telematics alert to remind you.",
            "Begin slowing early so you are at or below the new limit when you reach it."
          ],
          "correctIndex": 2,
          "feedback": [
            "Starting after the sign leaves you above the new limit when it begins.",
            "An alert can arrive late or be absent. Read the road and signs yourself.",
            "Correct. Anticipating the change gives you time for a controlled adjustment."
          ],
          "explanation": "Correct. Anticipating the change gives you time for a controlled adjustment.",
          "critical": false,
          "remediation": "Review 'Ease off before the change' and video scene 3."
        },
        {
          "id": "L1-Q3",
          "prompt": "A car enters the space ahead of your truck. There is no immediate emergency. What should you do?",
          "options": [
            "Ease off as needed and rebuild the gap smoothly when safe.",
            "Accelerate to make the car move away.",
            "Keep the smaller gap so another car cannot enter."
          ],
          "correctIndex": 0,
          "feedback": [
            "Correct. Restoring space preserves time to respond without creating a sudden manoeuvre.",
            "Accelerating toward the car reduces your options and can increase collision risk.",
            "Protecting a position in traffic is less important than restoring stopping room."
          ],
          "explanation": "Correct. Restoring space preserves time to respond without creating a sudden manoeuvre.",
          "critical": false,
          "remediation": "Review 'Protect the space ahead' and video scene 4."
        }
      ],
      "questionBankCount": 3,
      "scenes": [
        {
          "number": 1,
          "time": "00:00–00:10",
          "voiceover": "Extra speed leaves fewer options. In a heavy truck, staying in control starts with noticing your speed before the road changes ahead.",
          "visual": "Side view of the recurring tractor-trailer travelling steadily. A shaded gap ahead narrows as an unnumbered speed indicator rises. Return to the steady approach.",
          "onScreen": "RESET YOUR SPEED | More speed. Less room.",
          "production": "Show a simple conceptual gap, not a calibrated stopping-distance measurement. Title is inside this ten-second scene, not an extra intro."
        },
        {
          "number": 2,
          "time": "00:10–00:20",
          "voiceover": "The posted limit is a maximum. Rain, traffic, curves, or poor visibility can make that speed unsafe, even when other vehicles pass you.",
          "visual": "The same road gains light rain and reduced visibility. Reveal three labelled checks: legal limit, fleet limit, conditions. Reduce the truck's pace.",
          "onScreen": "LIMITS + CONDITIONS",
          "production": "Keep each check visible long enough to read. No invented speed sign or exact safe-speed number."
        },
        {
          "number": 3,
          "time": "00:20–00:30",
          "voiceover": "Check your speed as conditions change. Ease off early, then slow smoothly before a lower limit, a queue, or the next curve ahead.",
          "visual": "Top view of the same rig approaching a lower-limit boundary, then a curve. Highlight the approach section and animate controlled slowing before entry.",
          "onScreen": "ADJUST BEFORE THE CHANGE",
          "production": "Author the boundary label in the editor. Keep the truck aligned in its lane. Show normal anticipation, not an emergency-braking technique."
        },
        {
          "number": 4,
          "time": "00:30–00:40",
          "voiceover": "Protect the space ahead of your truck. When a vehicle moves into your gap, ease off and rebuild that space smoothly when safe.",
          "visual": "Overhead view: a car merges well ahead without imminent conflict. The truck gradually restores a visible buffer while staying in lane.",
          "onScreen": "REBUILD YOUR GAP",
          "production": "Hold the complete before-and-after relationship on one screen. No sudden swerve, brake check or collision."
        },
        {
          "number": 5,
          "time": "00:40–00:50",
          "voiceover": "Running late does not change safe speed. If conditions delay the trip, park safely before updating dispatch and agree on a realistic arrival.",
          "visual": "A delivery-clock icon appears, followed by a clearly parked rig in a truck rest area. Only then show a generic dispatch message.",
          "onScreen": "PARK FIRST. UPDATE DISPATCH.",
          "production": "Communication appears only after the vehicle is stationary and parked. Do not imply guaranteed on-time arrival."
        },
        {
          "number": 6,
          "time": "00:50–01:00",
          "voiceover": "On your next trip, use three actions: check the road, ease off early, and protect your space whenever limits or conditions change ahead.",
          "visual": "Three large action cards appear beside the stable truck: Check, Ease off, Protect space. End with a simple invitation to take the course questions.",
          "onScreen": "CHECK / EASE OFF / PROTECT SPACE | Next: 3 questions",
          "production": "Final two seconds retain the action cards. Quiz interaction belongs in the course player, not inside the MP4."
        }
      ],
      "transcript": "Extra speed leaves fewer options. In a heavy truck, staying in control starts with noticing your speed before the road changes ahead.\n\nThe posted limit is a maximum. Rain, traffic, curves, or poor visibility can make that speed unsafe, even when other vehicles pass you.\n\nCheck your speed as conditions change. Ease off early, then slow smoothly before a lower limit, a queue, or the next curve ahead.\n\nProtect the space ahead of your truck. When a vehicle moves into your gap, ease off and rebuild that space smoothly when safe.\n\nRunning late does not change safe speed. If conditions delay the trip, park safely before updating dispatch and agree on a realistic arrival.\n\nOn your next trip, use three actions: check the road, ease off early, and protect your space whenever limits or conditions change ahead.",
      "referenceIds": [
        "S01",
        "S02",
        "S03",
        "S05"
      ],
      "safetyNote": "Complete learning while safely parked. Use the event-review option if the assigned data does not match what happened. This course supports your fleet and vehicle guidance."
    },
    {
      "id": "speeding-course-2",
      "level": 2,
      "title": "Understand the consequences",
      "summary": "Your next improvement is to act earlier. Identify what usually pushes your speed up, then prepare a response before the road becomes demanding.",
      "tagline": "Extra speed changes the whole decision",
      "videoSeconds": 90,
      "media": {
        "videoUrl": "media/courses/speeding/speeding-level-2.mp4",
        "posterUrl": "media/courses/speeding/speeding-level-2.jpg",
        "captionsUrl": "media/courses/speeding/speeding-level-2.vtt",
        "resolution": "2560x1440",
        "narrator": "Emily",
        "captionsBurnedIn": true
      },
      "estimatedDuration": "5–6 min",
      "learningGoal": "Connect speed to stopping, energy, curves and braking heat.",
      "lesson": [
        {
          "heading": "Stopping has stages",
          "body": "You travel while you notice a hazard and react. The braking system also takes time to respond. Then the truck continues moving while it slows. More speed uses more road during the same reaction time; strong brakes cannot recover distance already used."
        },
        {
          "heading": "Energy grows faster than speed",
          "body": "For the same truck and load, 10% more speed means 21% more kinetic energy: 1.10 × 1.10 = 1.21. This is an energy comparison, not a prediction of stopping distance. Grip, brake response, vehicle condition and driver response also matter."
        },
        {
          "heading": "Slow before curves",
          "body": "Curve speed and the load’s center of gravity affect rollover risk. Establish a suitable speed before entering, then maintain a smooth path. Another vehicle’s speed is not your truck’s safe entry speed."
        },
        {
          "heading": "Prepare for a descent",
          "body": "Choose a safe entry speed and gear before the downgrade, following the vehicle manufacturer’s guidance, road instructions and approved fleet procedure. Prolonged service braking can build heat and reduce braking effectiveness."
        },
        {
          "heading": "Change the pressure response",
          "body": "If your schedule starts driving your speed, reset the plan. Adjust speed for the conditions and contact dispatch from a safe parked location. A later arrival is a planning issue to resolve."
        }
      ],
      "commitment": {
        "title": "Your next-trip commitment",
        "prompt": "When I notice __________________, I will __________________ before the next hazard. If that affects arrival, I will contact dispatch when safely parked.",
        "instruction": "Complete the when/then commitment.",
        "fields": [
          {
            "id": "cue",
            "label": "When I notice",
            "prompt": "When I notice __________________"
          },
          {
            "id": "response",
            "label": "I will",
            "prompt": "I will __________________ before the next hazard."
          }
        ]
      },
      "questions": [
        {
          "id": "L2-Q1",
          "prompt": "Traffic begins bunching ahead. You are alert and your brakes passed inspection, but your speed has crept up. Which choice best preserves stopping room?",
          "options": [
            "Keep speed until the nearest vehicle brakes; the brakes are in good condition.",
            "Ease off early and rebuild space before the queue reaches you.",
            "Keep speed and cover the brake; attention removes reaction distance."
          ],
          "correctIndex": 1,
          "feedback": [
            "Good brakes do not recover the road used before braking begins. Waiting spends the space you could preserve.",
            "Correct. Early speed reduction preserves space before traffic forces an urgent stop.",
            "Being prepared helps, but perception, reaction and brake response still take time."
          ],
          "explanation": "Correct. Early speed reduction preserves space before traffic forces an urgent stop.",
          "critical": false,
          "remediation": "Review Stopping has stages (video scenes 2, 4)."
        },
        {
          "id": "L2-Q2",
          "prompt": "A car keeps its speed entering a tightening ramp. Your loaded trailer has a high center of gravity. What should determine your approach?",
          "options": [
            "The truck, load, curve and conditions; reduce to a suitable entry speed before turning.",
            "The car’s pace, provided the truck feels stable on the straight approach.",
            "The straight-road speed limit, with speed correction after entering the curve."
          ],
          "correctIndex": 0,
          "feedback": [
            "Correct. Establish control before the curve; the load and curve change your truck’s stability demands.",
            "A passenger vehicle’s path does not establish a safe speed for your truck and load.",
            "A straight approach gives little assurance about curve stability. Delaying adjustment reduces your options."
          ],
          "explanation": "Correct. Establish control before the curve; the load and curve change your truck’s stability demands.",
          "critical": false,
          "remediation": "Review Slow before curves (video scenes 5)."
        },
        {
          "id": "L2-Q3",
          "prompt": "You approach a long downgrade. You are behind schedule, and the truck is still moving at its level-road speed. What is the best preparation?",
          "options": [
            "Enter at the current speed and use steady service braking for the whole descent.",
            "Coast in neutral down the first section, then choose a gear once the grade becomes clear.",
            "Set the entry speed and gear before descending, using the manufacturer’s guidance and approved procedure."
          ],
          "correctIndex": 2,
          "feedback": [
            "Prolonged braking can create excessive heat. Do not use continuous braking to compensate for an unsuitable entry speed.",
            "Coasting removes an important means of control and postpones preparation until the descent has begun.",
            "Correct. Prepare before entry, account for the load and conditions, and use the vehicle-specific descent procedure."
          ],
          "explanation": "Correct. Prepare before entry, account for the load and conditions, and use the vehicle-specific descent procedure.",
          "critical": true,
          "remediation": "Review Prepare for a descent (video scenes 6, 7)."
        },
        {
          "id": "L2-Q4",
          "prompt": "After another delay, you think a small speed increase will make little difference. Rain is building and queues are possible. Which plan should you follow?",
          "options": [
            "Increase speed slightly because a small percentage cannot meaningfully change the risk.",
            "Choose a lower speed for rain and available space, then update dispatch when safely parked.",
            "Keep the current pace until a speed alert or hard-braking warning appears."
          ],
          "correctIndex": 1,
          "feedback": [
            "Energy increases with the square of speed for the same mass. A small increase also consumes more space before braking.",
            "Correct. Respond to the conditions and resolve the schedule separately from the driving task.",
            "Warnings may come after your margin is already reduced. Use the visible conditions to act earlier."
          ],
          "explanation": "Correct. Respond to the conditions and resolve the schedule separately from the driving task.",
          "critical": false,
          "remediation": "Review Energy grows faster than speed (video scenes 3, 4, 8, 9); Change the pressure response (video scenes 8, 9)."
        }
      ],
      "questionBankCount": 4,
      "scenes": [
        {
          "number": 1,
          "time": "00:00–00:10",
          "voiceover": "Another speeding event needs a different response. Learn how extra speed changes control, and choose safer actions before hazards develop.",
          "visual": "Open on the same unbranded slate-gray tractor and white box trailer traveling smoothly. Transition to three clean icons: stopping, curve, descent.",
          "onScreen": "LEVEL 2 • UNDERSTAND THE CONSEQUENCES",
          "production": "Calm, firm Emily narration. No incident recreation or implication that this is the driver’s own recorded event. Use authored title graphics."
        },
        {
          "number": 2,
          "time": "00:10–00:20",
          "voiceover": "Stopping starts before the brakes work. You travel while noticing danger and reacting, then while brakes apply and slow the truck.",
          "visual": "Side view of the truck beside a three-part authored timeline: perception and reaction, brake response, braking. Animate continuous forward movement through all three stages.",
          "onScreen": "NOTICE + REACT → BRAKE RESPONSE → SLOW TO STOP",
          "production": "Conceptual diagram, not to scale. Label each stage in the editor. Do not imply instantaneous air-brake response or assign fixed distances."
        },
        {
          "number": 3,
          "time": "00:20–00:30",
          "voiceover": "Speed adds more than distance. For the same truck and load, ten percent faster means twenty-one percent more kinetic energy to manage.",
          "visual": "Keep truck and load identical. Author two paired bars on identical baselines: relative speed 100 to 110; relative kinetic energy 100 to 121.",
          "onScreen": "SAME TRUCK + LOAD: +10% SPEED → +21% KINETIC ENERGY",
          "production": "Exact instructional graphic must be authored in an editor. Use correct relative lengths. No simulated crash and no distance labels. Calculation is 1.10 squared."
        },
        {
          "number": 4,
          "time": "00:30–00:40",
          "voiceover": "That energy figure needs care. It cannot predict total stopping distance, which also depends on attention, brake response, tires, traction, and conditions.",
          "visual": "Replace bars with the stopping timeline from scene two. Add small readable labels for driver response, brake response, grip and conditions without invented numeric scales.",
          "onScreen": "ENERGY COMPARISON ≠ STOPPING-DISTANCE PREDICTION",
          "production": "Hold the clarification long enough to read. Do not depict a twenty-one percent increase in total stopping distance or a universal loaded-versus-empty stopping rule."
        },
        {
          "number": 5,
          "time": "00:40–00:50",
          "voiceover": "Curve speed affects rollover risk. A high center of gravity increases that risk; reduce speed before entry and maintain a steady path.",
          "visual": "Top-down diagram shows the same truck reducing speed on approach and tracking smoothly through a ramp. Small side cutaway shows a securely loaded high center of gravity.",
          "onScreen": "SLOW BEFORE THE CURVE",
          "production": "No lane crossing, tipping stunt, sliding cargo or corrective swerve. Draw the center-of-gravity marker manually; the trailer follows a plausible path."
        },
        {
          "number": 6,
          "time": "00:50–01:00",
          "voiceover": "Prepare before the downhill begins. Choose safe entry speed and gear using the manufacturer's guidance and your fleet's approved descent procedure.",
          "visual": "Truck approaches a downhill. Freeze before descent and display a three-item preparation card: entry speed, gear, approved procedure. Then show a stable controlled descent.",
          "onScreen": "BEFORE DESCENT: SPEED • GEAR • PROCEDURE",
          "production": "Do not specify gears, RPM, retarder settings or braking cadence. Do not show shifting during descent or a phone/manual being consulted while moving."
        },
        {
          "number": 7,
          "time": "01:00–01:10",
          "voiceover": "Heat can reduce braking effectiveness. Entering too fast and relying on prolonged service braking can leave less reserve for the next hazard.",
          "visual": "Clean technical cutaway of a brake with an authored conceptual heat indicator. Return to the truck descending steadily at its prepared speed.",
          "onScreen": "PREPARE EARLY. PROTECT BRAKING CAPACITY.",
          "production": "No glowing red wheels, smoke, mechanical failures or temperature values. Heat indicator is conceptual, not a diagnostic scale."
        },
        {
          "number": 8,
          "time": "01:10–01:20",
          "voiceover": "Rain reduces visibility; traffic bunches ahead. Ease off early and rebuild space, then discuss any delay with dispatch when safely parked.",
          "visual": "Rain reduces the visible road ahead. Show the truck easing down before a visible queue and retaining ample open space. An arrival-time card remains in a separate editor panel.",
          "onScreen": "RAIN + QUEUES: ADJUST EARLY",
          "production": "No unsafe braking demonstration or time-saving claim. Do not show a driver handling a device. Queue is visible within the illustrated sight distance."
        },
        {
          "number": 9,
          "time": "01:20–01:30",
          "voiceover": "Change the decision before the hazard. Identify your pressure point, choose an early action, and discuss delays with dispatch when safely parked.",
          "visual": "Truck is stationary in a designated rest area. Finish on an authored commitment card with two blanks and the prompt to continue to questions.",
          "onScreen": "WHEN I NOTICE ___, I WILL ___",
          "production": "Show a clear parked setting before any dispatch communication. Final two seconds hold the course card. Quiz and commitment are LMS interactions outside the MP4."
        }
      ],
      "transcript": "Another speeding event needs a different response. Learn how extra speed changes control, and choose safer actions before hazards develop.\n\nStopping starts before the brakes work. You travel while noticing danger and reacting, then while brakes apply and slow the truck.\n\nSpeed adds more than distance. For the same truck and load, ten percent faster means twenty-one percent more kinetic energy to manage.\n\nThat energy figure needs care. It cannot predict total stopping distance, which also depends on attention, brake response, tires, traction, and conditions.\n\nCurve speed affects rollover risk. A high center of gravity increases that risk; reduce speed before entry and maintain a steady path.\n\nPrepare before the downhill begins. Choose safe entry speed and gear using the manufacturer's guidance and your fleet's approved descent procedure.\n\nHeat can reduce braking effectiveness. Entering too fast and relying on prolonged service braking can leave less reserve for the next hazard.\n\nRain reduces visibility; traffic bunches ahead. Ease off early and rebuild space, then discuss any delay with dispatch when safely parked.\n\nChange the decision before the hazard. Identify your pressure point, choose an early action, and discuss delays with dispatch when safely parked.",
      "referenceIds": [
        "S01",
        "S02",
        "S04",
        "S06",
        "S07",
        "S08",
        "S09"
      ],
      "safetyNote": "Complete learning while safely parked. Use the event-review option if the assigned data does not match what happened. This course supports your fleet and vehicle guidance."
    },
    {
      "id": "speeding-course-3",
      "level": 3,
      "title": "Make the safer decision",
      "summary": "Maya has a secured load, a tight delivery time and worsening weather. Her route includes a curved exit and a long downgrade. Use this sequence to protect control.",
      "tagline": "Control the trip before pressure controls your speed",
      "videoSeconds": 120,
      "media": {
        "videoUrl": "media/courses/speeding/speeding-level-3.mp4",
        "posterUrl": "media/courses/speeding/speeding-level-3.jpg",
        "captionsUrl": "media/courses/speeding/speeding-level-3.vtt",
        "resolution": "2560x1440",
        "narrator": "Emily",
        "captionsBurnedIn": true
      },
      "estimatedDuration": "8–10 min + coach",
      "learningGoal": "Handle a combined-hazard trip and write a measurable plan.",
      "lesson": [
        {
          "heading": "Plan while parked",
          "body": "While parked, check the route, weather, truck restrictions, load and suitable stopping places. Agree a realistic arrival plan. Stay within applicable limits and fleet policy; conditions can require a lower speed."
        },
        {
          "heading": "Slow before the difficult section",
          "body": "Ease off early as rain, traffic or visibility changes, and allow more following space. Reduce speed before the ramp while still on the straight approach. A curve advisory cannot guarantee a safe speed for your truck, load or surface."
        },
        {
          "heading": "Prepare for the descent",
          "body": "Before descending, set a suitable speed and gear. Follow signs, required brake checks, manufacturer guidance and the approved fleet procedure. Excessive braking can build heat and reduce braking effectiveness."
        },
        {
          "heading": "Decide when to stop",
          "body": "If you cannot continue safely, take the safest available stopping option. Maya can enter a suitable truck parking area before dense fog. She parks clear of traffic before calling dispatch."
        },
        {
          "heading": "Make the change observable",
          "body": "Once parked, tell dispatch the conditions, location and delay. Agree the next check-in. Record one recurring pressure, an earlier response and the support you need. Review future trips with your coach."
        }
      ],
      "commitment": {
        "title": "Make the plan",
        "prompt": "When [specific pressure or road cue] appears, I will [safe action before the hazard]. If I cannot continue safely, I will [safe stopping plan]. Once parked, I will contact [role] and agree [next step].",
        "instruction": "Complete this while parked and off the driving task. Your coach will review the plan with you.",
        "fields": [
          {
            "id": "event-context",
            "label": "What was happening around the assigned event?",
            "prompt": "Describe the road, weather, traffic, load and relevant pressure; note any disputed event data."
          },
          {
            "id": "decision-cue",
            "label": "What cue will prompt an earlier decision next time?",
            "prompt": "Name one specific cue, such as a delivery delay combined with rain or an approaching curve."
          },
          {
            "id": "safe-action",
            "label": "When that cue appears, what will you do?",
            "prompt": "Name the action and when you will take it, before entering the hazard."
          },
          {
            "id": "stopping-plan",
            "label": "If continuing becomes unsafe, what is your stopping plan?",
            "prompt": "Describe how you will use suitable stopping options and keep clear of moving traffic."
          },
          {
            "id": "support-needed",
            "label": "What help do you need, and from whom?",
            "prompt": "For example: dispatch revises delivery windows; a trainer reviews the vehicle's descent procedure."
          },
          {
            "id": "review-point",
            "label": "What will you and your coach review, and when?",
            "prompt": "Agree a date or trip milestone and use future driving evidence with distance, conditions and your account of the trip."
          }
        ]
      },
      "questions": [
        {
          "id": "L3-Q1",
          "prompt": "Maya is parked before departure. Her loaded truck's route includes rain, a curved exit and a long downgrade, but the delivery slot leaves little time. Which plan best addresses the combined risks?",
          "options": [
            "Allow extra time for rain, keep the delivery promise, and decide where to stop only if visibility becomes unsafe.",
            "Review the route and suitable stopping places, allow time for conditions, and revise the arrival plan with dispatch before departure.",
            "Plan suitable stopping places and reduce speed for conditions, but leave the delivery promise unchanged until the difficult sections are behind you."
          ],
          "correctIndex": 1,
          "feedback": [
            "Allowing extra time is useful, but waiting until visibility becomes unsafe can remove good stopping options. The arrival promise also needs to reflect the known hazards.",
            "Correct. This plan addresses driving conditions, stopping options and schedule pressure before the demanding part of the trip.",
            "The driving plan helps, but the unresolved arrival promise keeps schedule pressure active during the difficult sections. Address the known time constraint before leaving."
          ],
          "explanation": "Correct. This plan addresses driving conditions, stopping options and schedule pressure before the demanding part of the trip.",
          "critical": false,
          "remediation": "Review 'Plan while parked'. State which route feature needs a slower approach and what you would agree with dispatch before departure."
        },
        {
          "id": "L3-Q2",
          "prompt": "Rain continues as Maya approaches the curved exit. She is still on the straight approach and can slow safely. Which action best protects the loaded combination through the bend?",
          "options": [
            "Reduce speed before entering, then use smooth steering and keep reassessing the truck's control.",
            "Enter at the curve advisory because the sign establishes a safe speed for the loaded truck.",
            "Keep the approach speed until the bend reveals its full shape, then make the needed speed correction."
          ],
          "correctIndex": 0,
          "feedback": [
            "Correct. Slowing on the approach reduces the demand placed on the tires and the loaded combination when steering into the bend.",
            "A curve advisory does not account for every truck, load or surface condition. It is not a guarantee that the displayed speed is safe for Maya's combination.",
            "Delaying the speed adjustment can create an urgent need to brake while steering. Maya has an earlier opportunity to enter under control."
          ],
          "explanation": "Correct. Slowing on the approach reduces the demand placed on the tires and the loaded combination when steering into the bend.",
          "critical": true,
          "remediation": "Replay video scenes four through six. Explain the order aloud: assess the approach, reduce speed before the bend and steer smoothly. Reassess this decision before closing the course."
        },
        {
          "id": "L3-Q3",
          "prompt": "After the ramp, signs warn of a long descent. Maya's truck is loaded and the road remains wet. Which preparation is most appropriate before starting down?",
          "options": [
            "Enter at the legal maximum and let the transmission and service brakes manage changes as they occur.",
            "Use the same speed and braking routine as a lighter truck on a previous dry trip.",
            "Choose a suitable entry speed and gear, obey the signs and follow the approved vehicle-specific descent procedure."
          ],
          "correctIndex": 2,
          "feedback": [
            "The legal maximum does not account for this load, grade or surface. Entering too fast can demand excessive braking and reduce reserve.",
            "A different load and wet surface change the task. A familiar routine is not enough unless it is suitable for today's vehicle and conditions.",
            "Correct. Preparing before the descent gives Maya a suitable starting point and uses the guidance intended for her equipment and operating conditions."
          ],
          "explanation": "Correct. Preparing before the descent gives Maya a suitable starting point and uses the guidance intended for her equipment and operating conditions.",
          "critical": true,
          "remediation": "Review 'Prepare for the descent'. Find the applicable vehicle and fleet procedure; ask your coach about any unfamiliar control before driving the grade."
        },
        {
          "id": "L3-Q4",
          "prompt": "Beyond the descent, fog is thickening rapidly. Maya judges that the road ahead will soon be unsafe to continue on. A suitable truck parking area is visible and can be entered safely now. What should she do?",
          "options": [
            "Continue behind the vehicle ahead, using its lights to judge a suitable speed.",
            "Enter the parking area under control, park clear of traffic, then contact dispatch about the delay and next check-in.",
            "Stop in the current travel lane with hazard lights and call dispatch before choosing where to wait."
          ],
          "correctIndex": 1,
          "feedback": [
            "The other vehicle's lights do not establish adequate visibility or a safe speed for Maya's truck. Continuing would disregard her assessment that travel is becoming unsafe.",
            "Correct. A safe stopping opportunity is available before conditions become unmanageable. Contacting dispatch once parked keeps attention on controlling the truck during the approach.",
            "Stopping in a travel lane creates a collision risk when an accessible safe parking option exists. The dispatch conversation should follow safe parking."
          ],
          "explanation": "Correct. A safe stopping opportunity is available before conditions become unmanageable. Contacting dispatch once parked keeps attention on controlling the truck during the approach.",
          "critical": true,
          "remediation": "Review 'Decide when to stop' and video scenes nine through eleven. Explain where to stop in this scenario and why the dispatch contact comes after safe parking. Reassess this decision before closing the course."
        },
        {
          "id": "L3-Q5",
          "prompt": "Parked safely, Maya identifies that fear of missing delivery slots leads her to delay slowing. Which improvement plan gives her and her coach the clearest action to practise and review?",
          "options": [
            "When the schedule slips, I will keep condition-based speed, arrange a safe stop for any dispatch discussion and review the trip with my coach.",
            "I will concentrate harder and try to avoid another speeding alert on future deliveries.",
            "I will leave a few minutes earlier and use the posted maximum to reduce the chance of delay."
          ],
          "correctIndex": 0,
          "feedback": [
            "Correct. The plan names a recurring trigger, a specific safe response and a follow-up. A coach can check whether the response was used and whether scheduling support is needed.",
            "This is an intention without an observable response to schedule pressure. It does not tell Maya what to do differently at the decision point.",
            "Earlier departure may help planning, but using the posted maximum still ignores conditions. The plan needs a response when delays occur despite preparation."
          ],
          "explanation": "Correct. The plan names a recurring trigger, a specific safe response and a follow-up. A coach can check whether the response was used and whether scheduling support is needed.",
          "critical": false,
          "remediation": "Rewrite the commitment using a specific trigger and safe action. Include who will help resolve the pressure and how the next trip will be reviewed."
        }
      ],
      "questionBankCount": 5,
      "scenes": [
        {
          "number": 1,
          "time": "00:00–00:10",
          "voiceover": "Repeat speeding requires different decisions. Maya has a loaded delivery, worsening weather, and a tight schedule; your task is to protect control.",
          "visual": "Clean vector route overview establishes one tractor-trailer and driver Maya at the origin depot. Three small authored markers identify rain, a curve and a descent; delivery clock sits separately.",
          "onScreen": "MAKE THE SAFER DECISION",
          "production": "16:9 instructional graphics; Emily, calm and firm. Establish one consistent loaded dry-van combination. No crash imagery or accusation about the learner."
        },
        {
          "number": 2,
          "time": "00:10–00:20",
          "voiceover": "Plan before the wheels move. While parked, Maya reviews the route, weather, load, stopping options, and a realistic arrival plan with dispatch.",
          "visual": "Stationary truck in depot. Authored checklist appears beside route, with a safe truck parking area identified beyond the descent. Schedule is adjusted before the vehicle moves.",
          "onScreen": "PLAN WHILE PARKED",
          "production": "Phone or dispatch screen is visible only inside the clearly parked cab. Create all text and route markings in the editor."
        },
        {
          "number": 3,
          "time": "00:20–00:30",
          "voiceover": "Rain changes the driving task. Maya lowers her speed, allows more following space, and keeps every control input smooth as conditions worsen.",
          "visual": "Truck proceeds in its lane on wet straight highway. An authored space band opens behind the lead vehicle as the truck slows gently.",
          "onScreen": "LESS SPEED • MORE SPACE",
          "production": "Schematic spacing only, no fixed distance or speed label. No exaggerated tire spray, skid, abrupt brake pulse or invented numerical telemetry."
        },
        {
          "number": 4,
          "time": "00:30–00:40",
          "voiceover": "A wet ramp approaches. Its curve advisory cannot guarantee a safe speed for this loaded truck, and the delivery deadline changes nothing.",
          "visual": "Top-down view reveals curved exit ahead while truck remains on straight approach. A curve-warning symbol appears; a clock cue moves to a quiet corner.",
          "onScreen": "SLOW BEFORE THE CURVE",
          "production": "Do not fabricate a jurisdictional sign or universal safe number. Use an instructional curve icon; a real sign is permitted only from the approved country overlay."
        },
        {
          "number": 5,
          "time": "00:40–00:50",
          "voiceover": "Pause and choose: hold speed, brake inside the curve, or slow on the approach?",
          "visual": "Hold the schematic at the safe decision point before the ramp. Display three authored text choices as static lines, then keep the frame still for brief reflection.",
          "onScreen": "PAUSE AND CHOOSE | Hold speed / Brake in the curve / Slow before entry",
          "production": "Reflection prompt, not clickable controls. Finish the short narration within seven seconds and hold the choices in silence for at least three seconds. The learner can pause the player for longer. Reveal the answer only in the next scene."
        },
        {
          "number": 6,
          "time": "00:50–01:00",
          "voiceover": "Slow before steering into the curve. Maya reduces speed on the approach, then steers smoothly through the bend with her trailer tracking steadily.",
          "visual": "Selected text reads 'Slow early'. Highlight the straight approach as the deceleration area; follow the same combination through a moderate curve with consistent geometry.",
          "onScreen": "SLOW EARLY. STEER SMOOTHLY.",
          "production": "Keep tractor and trailer coupled and stable. Use authored path animation rather than AI-simulated tire forces. No hard braking or acceleration inside the curve."
        },
        {
          "number": 7,
          "time": "01:00–01:10",
          "voiceover": "The route now drops downhill. Before descending, Maya chooses suitable speed and gear, follows the signs, and uses her approved vehicle procedure.",
          "visual": "Route continues to the signed descent. A preparation card appears before the crest: speed, gear, signs, approved procedure. Truck then starts a controlled descent.",
          "onScreen": "PREPARE BEFORE DESCENDING",
          "production": "Show no gear number, retarder setting or repeated-braking technique. Any compulsory brake-check location or sign must match the reviewed route overlay."
        },
        {
          "number": 8,
          "time": "01:10–01:20",
          "voiceover": "Braking reserve can disappear. Entering too fast can demand excessive braking, building heat and reducing effectiveness just when the road requires more control.",
          "visual": "Beside the continuing controlled descent, a schematic brake icon warms under a labelled 'Excessive braking' example; return to the truck's composed progress.",
          "onScreen": "PROTECT BRAKING RESERVE",
          "production": "Illustrative heat cue only, without degrees or a quantitative reserve meter. Clearly separate the risk illustration from Maya's correct operating example."
        },
        {
          "number": 9,
          "time": "01:20–01:30",
          "voiceover": "Fog is closing in ahead. Visibility is deteriorating, and Maya judges that continued travel will soon be unsafe, even at a lower speed.",
          "visual": "After the descent, forward visibility narrows. The preplanned truck parking entrance remains visible before a dense fog bank farther along the route.",
          "onScreen": "WHEN SLOWING IS NOT ENOUGH",
          "production": "Make safe parking visibly available before the unsafe section. Do not depict continued travel into near-zero visibility or following another vehicle's lights."
        },
        {
          "number": 10,
          "time": "01:30–01:40",
          "voiceover": "A safe truck parking area is available. Maya enters under control and parks clear of traffic, before fog removes that safe stopping opportunity.",
          "visual": "Same truck signals and follows an authored path into a sufficiently large designated parking area, fully clears the roadway and becomes stationary in a truck bay.",
          "onScreen": "SAFE PLACE. PARK FIRST.",
          "production": "Show a legal, accessible truck parking area, not a narrow shoulder. No abrupt swerve, blind entrance, travel-lane stop or phone use during movement."
        },
        {
          "number": 11,
          "time": "01:40–01:50",
          "voiceover": "Dispatch needs a revised plan. Parked safely, Maya reports the conditions, confirms her location, explains the delay, and agrees the next safe check-in.",
          "visual": "Parked cab cutaway and authored dispatch message card: conditions, location, delay, next check-in. Clock pressure resolves into an agreed waiting plan.",
          "onScreen": "REPORT CONDITIONS. REPLAN THE TRIP.",
          "production": "No promise of an exact arrival while conditions remain unknown. Leave the vehicle parked throughout the conversation."
        },
        {
          "number": 12,
          "time": "01:50–02:00",
          "voiceover": "Make your next choice measurable. Write your pressure trigger, safe response, and the support you need, then review future trips with your coach.",
          "visual": "End on an authored action-plan card next to the safely parked truck: 'When… I will… I need…'. Finish with course quiz and coach-review reminder.",
          "onScreen": "TRIGGER → ACTION → REVIEW",
          "production": "The MP4 ends at exactly two minutes. Quiz and actual form fields live in the course player outside the video; no fake submission or completion animation."
        }
      ],
      "transcript": "Repeat speeding requires different decisions. Maya has a loaded delivery, worsening weather, and a tight schedule; your task is to protect control.\n\nPlan before the wheels move. While parked, Maya reviews the route, weather, load, stopping options, and a realistic arrival plan with dispatch.\n\nRain changes the driving task. Maya lowers her speed, allows more following space, and keeps every control input smooth as conditions worsen.\n\nA wet ramp approaches. Its curve advisory cannot guarantee a safe speed for this loaded truck, and the delivery deadline changes nothing.\n\nPause and choose: hold speed, brake inside the curve, or slow on the approach?\n\nSlow before steering into the curve. Maya reduces speed on the approach, then steers smoothly through the bend with her trailer tracking steadily.\n\nThe route now drops downhill. Before descending, Maya chooses suitable speed and gear, follows the signs, and uses her approved vehicle procedure.\n\nBraking reserve can disappear. Entering too fast can demand excessive braking, building heat and reducing effectiveness just when the road requires more control.\n\nFog is closing in ahead. Visibility is deteriorating, and Maya judges that continued travel will soon be unsafe, even at a lower speed.\n\nA safe truck parking area is available. Maya enters under control and parks clear of traffic, before fog removes that safe stopping opportunity.\n\nDispatch needs a revised plan. Parked safely, Maya reports the conditions, confirms her location, explains the delay, and agrees the next safe check-in.\n\nMake your next choice measurable. Write your pressure trigger, safe response, and the support you need, then review future trips with your coach.",
      "referenceIds": [
        "S01",
        "S02",
        "S04",
        "S05",
        "S07",
        "S08",
        "S09"
      ],
      "safetyNote": "Complete learning while safely parked. Use the event-review option if the assigned data does not match what happened. This course supports your fleet and vehicle guidance.",
      "coachReview": {
        "title": "Coach conversation",
        "summary": "Use a short conversation to confirm the plan, identify support and arrange the follow-up. Rate each criterion as “Demonstrated” or “Needs more practice”.",
        "ratingOptions": [
          "Demonstrated",
          "Needs more practice"
        ],
        "criteria": [
          {
            "title": "Explains safe decisions in the combined scenario",
            "description": "Driver explains why speed is reduced before the ramp, why the descent is prepared for in advance, and why available safe parking is used before visibility makes travel unsafe.",
            "ifNotMet": "Review the missed decision with a new scenario and arrange practical instruction where needed."
          },
          {
            "title": "Commits to a specific, feasible response",
            "description": "Plan connects a real trigger to an earlier action, a safe stopping and contact sequence, named support and an agreed review point.",
            "ifNotMet": "Resolve vague actions or operational barriers together; assign the relevant scheduling or equipment support owner."
          },
          {
            "title": "Shows the response on subsequent trips",
            "description": "Coach reviews sufficiently comparable future driving exposure, validated speed events and driver context, and finds evidence that the agreed response is being used. Document the observation and any remaining uncertainty.",
            "ifNotMet": "If driving exposure or evidence is insufficient, keep outcome status pending. If verified risk persists, investigate the barrier and arrange further coaching under fleet policy."
          }
        ],
        "recordFields": [
          "coach name",
          "review date",
          "support owner",
          "next check-in",
          "evidence considered",
          "outcome status"
        ],
        "note": "The video, quiz and action plan can be recorded as completed before on-road improvement is confirmed. Do not mark behaviour improved solely because the course was finished or no alerts appeared during little or no driving."
      }
    }
  ],
  "references": [
    {
      "id": "S01",
      "title": "FMCSA — CMV Safe Speed",
      "url": "https://www.fmcsa.dot.gov/safespeed",
      "note": "All levels: choose speed for the vehicle and conditions; curves and ramps. Full page retrieved; updated May 8, 2026."
    },
    {
      "id": "S02",
      "title": "FMCSA — Too Fast for Conditions",
      "url": "https://www.fmcsa.dot.gov/safety/driver-safety/cmv-driving-tips-too-fast-conditions",
      "note": "All levels: early adjustment, curves, work zones and reduced grip. Full page retrieved. Historical crash percentages and blanket speed-reduction fractions are not used."
    },
    {
      "id": "S03",
      "title": "FMCSA — Following Too Closely",
      "url": "https://www.fmcsa.dot.gov/safety/driver-safety/cmv-driving-tips-following-too-closely",
      "note": "Level 1: preserve and rebuild following space. Full page retrieved. No universal stopping-distance figure is used."
    },
    {
      "id": "S04",
      "title": "FMCSA — Tips for Truck and Bus Drivers",
      "url": "https://www.fmcsa.dot.gov/ourroads/tips-truck-and-bus-drivers",
      "note": "Levels 2–3: planning, long stopping requirements, curves, grades, secure loads and attention. Full page retrieved; updated May 12, 2026."
    },
    {
      "id": "S05",
      "title": "Transport Canada — Driving safely in winter",
      "url": "https://tc.canada.ca/en/road-transportation/stay-safe-when-driving/winter-driving/driving-safely-winter",
      "note": "All levels: reduced visibility, appropriate speed, extra space and safe stopping when travel becomes too risky. Full page retrieved; updated January 9, 2026. Passenger-vehicle emergency braking instructions are not transferred into this course."
    },
    {
      "id": "S06",
      "title": "NASA Glenn — Conservation of Energy",
      "url": "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/conservation-of-energy/",
      "note": "Level 2: K = mv²/2. Original calculation with constant mass: 1.10² = 1.21. This supports the energy ratio only, not a stopping-distance or crash-risk percentage."
    },
    {
      "id": "S07",
      "title": "ICBC — Driving Commercial Vehicles",
      "url": "https://www.icbc.com/assets/en/3ZRN0guL3MkbgvZvTCBfbu/drive_commercial_veh_full.pdf",
      "note": "Levels 2–3: descent planning and appropriate gear. Official indexed text retrieved; full PDF retrieval was blocked. Confirm equipment-specific procedures against the current manual before release."
    },
    {
      "id": "S08",
      "title": "Ontario — Demands on Brakes While Driving",
      "url": "https://www.ontario.ca/document/official-air-brake-handbook/demands-brakes-while-driving",
      "note": "Level 2: brake response and heat. Official indexed text retrieved; direct page access was blocked. No numerical brake-lag or stopping-distance rule is asserted."
    },
    {
      "id": "S09",
      "title": "Ontario — Vehicle Braking Systems",
      "url": "https://www.ontario.ca/document/official-air-brake-handbook/vehicle-braking-systems",
      "note": "Levels 2–3: excess heat can reduce braking effectiveness. Official indexed text retrieved. Detailed component instruction is outside this course."
    },
    {
      "id": "S10",
      "title": "Higgsfield — Editorial Motion Graphics",
      "url": "https://higgsfield.ai/skills/editorial-motion-graphics",
      "note": "Production: official workflow advertises narrated explainers with graphics, captions and assembly. Live capability, voice availability and costs must be checked in the connected workspace; exact timing and text still need review."
    }
  ]
};
