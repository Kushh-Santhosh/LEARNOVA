"""
LEARNOVA Demo Data: Computer Networks & The OSI Model
A high-depth educational curriculum designed for the competition demo.
Grounded in genuine networking engineering principles.
"""

from typing import List, Dict, Any

DEMO_DOCUMENT_ID = "doc_networks_osi_101"
DEMO_DOCUMENT_TITLE = "Computer Networks: Principles, OSI Architecture & Protocols"

DEMO_SECTIONS = [
    {
        "id": "sec_1",
        "title": "Introduction to Network Architecture",
        "page_start": 1,
        "page_end": 1,
        "summary": "Foundational concepts of distributed computing, packet switching vs circuit switching."
    },
    {
        "id": "sec_2",
        "title": "The OSI 7-Layer Reference Model",
        "page_start": 2,
        "page_end": 3,
        "summary": "Layered architecture, encapsulation, protocol data units (PDUs), and layer responsibilities."
    },
    {
        "id": "sec_3",
        "title": "The Transport Layer: TCP vs UDP",
        "page_start": 4,
        "page_end": 5,
        "summary": "End-to-end communication, connection-oriented vs connectionless, reliability, flow control, 3-way handshake."
    },
    {
        "id": "sec_4",
        "title": "Network Layer & IP Addressing",
        "page_start": 6,
        "page_end": 7,
        "summary": "Logical addressing, routing algorithms, IPv4 vs IPv6, and packet forwarding."
    },
    {
        "id": "sec_5",
        "title": "Data Link & Physical Foundations",
        "page_start": 8,
        "page_end": 9,
        "summary": "Framing, MAC addresses, error detection (CRC), and bit transmission."
    }
]

DEMO_CHUNKS: List[Dict[str, Any]] = [
    {
        "chunk_id": "chk_net_01",
        "document_id": DEMO_DOCUMENT_ID,
        "page_number": 1,
        "section": "Introduction to Network Architecture",
        "content": "A computer network is an interconnected collection of autonomous computers capable of exchanging data. In modern packet-switched networks, data is divided into small discrete packets that travel independently across network nodes. Unlike traditional circuit-switched telephone lines that dedicate an entire physical channel for the duration of a call, packet switching dynamically multiplexes bandwidth, drastically maximizing resource utilization.",
        "source_type": "text"
    },
    {
        "chunk_id": "chk_net_02",
        "document_id": DEMO_DOCUMENT_ID,
        "page_number": 2,
        "section": "The OSI 7-Layer Reference Model",
        "content": "The Open Systems Interconnection (OSI) model is a conceptual framework established by ISO. It organizes network communications into seven discrete functional layers: 1. Physical, 2. Data Link, 3. Network, 4. Transport, 5. Session, 6. Presentation, and 7. Application. Each layer serves the layer above it and is served by the layer below it through well-defined service access points (SAPs). Data moves downward through encapsulation: each layer appends a protocol header containing control instructions.",
        "source_type": "text"
    },
    {
        "chunk_id": "chk_net_03",
        "document_id": DEMO_DOCUMENT_ID,
        "page_number": 4,
        "section": "The Transport Layer: TCP vs UDP",
        "content": "The Transport Layer (Layer 4) is responsible for true end-to-end process-to-process communication between host applications. Its two preeminent protocols are TCP (Transmission Control Protocol) and UDP (User Datagram Protocol). TCP provides connection-oriented, reliable byte stream delivery using a 3-Way Handshake (SYN -> SYN-ACK -> ACK), positive acknowledgments with retransmission (PAR), and sliding-window flow control. In stark contrast, UDP is a lightweight, connectionless protocol that sends independent datagrams without establishing a handshake, without acknowledgments, and without delivery guarantees.",
        "source_type": "text"
    },
    {
        "chunk_id": "chk_net_04",
        "document_id": DEMO_DOCUMENT_ID,
        "page_number": 5,
        "section": "The Transport Layer: TCP vs UDP",
        "content": "A crucial engineering distinction lies in the trade-off between reliability and latency. UDP possesses minimal protocol overhead (only an 8-byte header compared to TCP's 20-60 byte header). Because UDP incurs zero retransmission delay, it is optimal for time-sensitive, loss-tolerant applications such as live video streaming, DNS lookups, and multiplayer gaming. However, UDP's speed does NOT make it reliable. If a packet is dropped due to network congestion, UDP drops it silently. TCP ensures zero data loss through sequence numbers, checksums, and retransmissions, making it essential for file transfers (HTTP, FTP, SSH).",
        "source_type": "text"
    },
    {
        "chunk_id": "chk_net_05",
        "document_id": DEMO_DOCUMENT_ID,
        "page_number": 6,
        "section": "Network Layer & IP Addressing",
        "content": "The Network Layer (Layer 3) handles host-to-host delivery and logical routing of packets across disparate interconnected networks. The core protocol is the Internet Protocol (IP). Routers inspect IP packet headers and utilize routing tables (dynamically populated via OSPF, BGP) to determine the optimal next-hop path. Unlike the Transport Layer which addresses individual processes via port numbers, the Network Layer addresses entire machines using IP addresses.",
        "source_type": "text"
    }
]

DEMO_CONCEPTS: List[Dict[str, Any]] = [
    {
        "id": "c_packet_switching",
        "name": "Packet Switching",
        "category": "Foundations",
        "summary": "Dividing data into discrete chunks that route dynamically across shared infrastructure without dedicated circuits.",
        "page_number": 1,
        "mastery_score": 0.35,
        "status": "needs_review"
    },
    {
        "id": "c_osi_model",
        "name": "OSI 7-Layer Model",
        "category": "Architecture",
        "summary": "Seven-tier conceptual reference model defining network protocol hierarchies and encapsulation.",
        "page_number": 2,
        "mastery_score": 0.40,
        "status": "improving"
    },
    {
        "id": "c_transport_layer",
        "name": "Transport Layer (L4)",
        "category": "OSI Layer",
        "summary": "Process-to-process communication, port addressing, multiplexing, and end-to-end reliability control.",
        "page_number": 4,
        "mastery_score": 0.50,
        "status": "improving"
    },
    {
        "id": "c_tcp",
        "name": "TCP Protocol",
        "category": "Transport Protocol",
        "summary": "Connection-oriented, reliable byte stream protocol utilizing 3-way handshakes and retransmission.",
        "page_number": 4,
        "mastery_score": 0.25,
        "status": "needs_review"
    },
    {
        "id": "c_udp",
        "name": "UDP Protocol",
        "category": "Transport Protocol",
        "summary": "Connectionless, low-overhead, best-effort datagram service without acknowledgments or retransmission.",
        "page_number": 4,
        "mastery_score": 0.20,
        "status": "needs_review"
    },
    {
        "id": "c_network_layer",
        "name": "Network Layer (L3)",
        "category": "OSI Layer",
        "summary": "Host-to-host packet routing, logical IP addressing, and path determination across subnets.",
        "page_number": 6,
        "mastery_score": 0.15,
        "status": "unseen"
    },
    {
        "id": "c_encapsulation",
        "name": "Data Encapsulation",
        "category": "Mechanism",
        "summary": "The downward traversal of data where each OSI layer wraps payloads in headers and trailers.",
        "page_number": 3,
        "mastery_score": 0.30,
        "status": "needs_review"
    }
]

DEMO_RELATIONSHIPS: List[Dict[str, Any]] = [
    {
        "source": "c_packet_switching",
        "target": "c_osi_model",
        "type": "part_of",
        "description": "Packet switching principles underpin the OSI communication hierarchy"
    },
    {
        "source": "c_osi_model",
        "target": "c_transport_layer",
        "type": "part_of",
        "description": "Transport Layer is Layer 4 of the OSI 7-Layer model"
    },
    {
        "source": "c_osi_model",
        "target": "c_network_layer",
        "type": "part_of",
        "description": "Network Layer is Layer 3 of the OSI 7-Layer model"
    },
    {
        "source": "c_transport_layer",
        "target": "c_tcp",
        "type": "example_of",
        "description": "TCP is a primary reliable connection-oriented transport protocol"
    },
    {
        "source": "c_transport_layer",
        "target": "c_udp",
        "type": "example_of",
        "description": "UDP is a primary connectionless transport protocol"
    },
    {
        "source": "c_tcp",
        "target": "c_udp",
        "type": "depends_on",
        "description": "Understanding TCP reliability requires contrasting with UDP best-effort behavior"
    },
    {
        "source": "c_transport_layer",
        "target": "c_encapsulation",
        "type": "depends_on",
        "description": "L4 segments are encapsulated into L3 network packets"
    }
]

DEMO_COMMON_MISCONCEPTIONS = [
    {
        "keywords": ["speed", "faster", "reliable", "udp is reliable"],
        "concept": "TCP vs UDP",
        "misconception": "Believing that UDP is reliable because it transmits faster than TCP.",
        "severity": "high",
        "root_cause": "Conflating transmission velocity with delivery assurance.",
        "evidence": "Section 3, Page 4-5 explicitly notes UDP has zero delivery guarantees or retransmission.",
        "remediation_strategy": "Separate speed from reliability. Use the Registered Mail vs. Megaphone Postal Analogy.",
        "teacher_remediation_response": (
            "I see what you're thinking, but you are mixing up two completely different engineering properties: **Speed** vs **Reliability**.\n\n"
            "• **Reliability** means: Did every piece of data arrive intact, with zero loss?\n"
            "• **Speed** means: How few milliseconds did it take to transmit?\n\n"
            "Think of it like this: **UDP is like shouting announcements through a megaphone**. It is lightning fast, but if someone is across the street or a car drives by, words get lost and UDP never checks.\n\n"
            "**TCP is like Certified Postal Mail with Return Receipt Requested**. The postman refuses to leave until you sign for it. If an envelope is lost in transit, they automatically resend an exact duplicate.\n\n"
            "Does that distinction between transmission speed and delivery guarantee make sense?"
        ),
        "visual_payload": {
            "type": "comparison_table",
            "title": "Speed vs. Reliability: The Postal Analogy",
            "data": {
                "headers": ["Metric", "TCP (Certified Mail)", "UDP (Megaphone Shouting)"],
                "rows": [
                    ["Handshake", "Required (3-way sync)", "None (Immediate shoot & forget)"],
                    ["Speed / Latency", "Moderate (retransmission pauses)", "Maximum (zero wait states)"],
                    ["Guaranteed Delivery", "YES (100% loss-free retransmission)", "NO (dropped packets vanish)"],
                    ["Ordering", "Sequenced (1, 2, 3 in exact order)", "Unordered (arrivals can scramble)"],
                    ["Best For", "Web pages, Banking, Documents", "Video calls, Live gaming, DNS"]
                ]
            },
            "source": {"page": 5, "section": "The Transport Layer: TCP vs UDP"}
        }
    }
]

DEMO_QUIZZES = [
    {
        "id": "q_tcp_01",
        "type": "mcq",
        "concept": "TCP Protocol",
        "question": "Why does TCP utilize a 3-way handshake before transmitting user application data?",
        "options": [
            "To encrypt all application payloads with TLS keys",
            "To synchronize initial sequence numbers and agree upon connection parameters",
            "To compress the header down to 8 bytes for faster throughput",
            "To convert logical IP addresses into physical MAC addresses"
        ],
        "correct_answer": "To synchronize initial sequence numbers and agree upon connection parameters",
        "explanation": "TCP's 3-way handshake (SYN -> SYN-ACK -> ACK) allows both client and server to negotiate buffer allocations, maximum segment sizes (MSS), and synchronize sequence numbers to guarantee ordered delivery.",
        "difficulty": "medium",
        "source": {"page": 4, "section": "The Transport Layer: TCP vs UDP"}
    },
    {
        "id": "q_udp_02",
        "type": "true_false",
        "concept": "UDP Protocol",
        "question": "UDP provides automatic retransmission when packets are dropped due to network buffer overflows.",
        "options": ["True", "False"],
        "correct_answer": "False",
        "explanation": "UDP has no acknowledgment mechanism and maintains zero state regarding sent packets. If a packet is dropped, UDP takes no action whatsoever.",
        "difficulty": "easy",
        "source": {"page": 5, "section": "The Transport Layer: TCP vs UDP"}
    },
    {
        "id": "q_osi_03",
        "type": "mcq",
        "concept": "OSI 7-Layer Model",
        "question": "Which OSI layer is responsible for translating host names to IP addresses or handling application protocols like HTTP and DNS?",
        "options": [
            "Layer 2: Data Link",
            "Layer 3: Network",
            "Layer 4: Transport",
            "Layer 7: Application"
        ],
        "correct_answer": "Layer 7: Application",
        "explanation": "Layer 7 provides services directly to end-user software, including HTTP, DNS, FTP, and SMTP. Layer 3 only handles routing of IP packets.",
        "difficulty": "medium",
        "source": {"page": 2, "section": "The OSI 7-Layer Reference Model"}
    }
]
