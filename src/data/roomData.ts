export interface RoomEntry {
  name: string;
  anydesk: string;
  ip?: string;
  notes?: string;
}

export interface CityData {
  name: string;
  country: string;
  rooms: RoomEntry[];
}

export const roomData: CityData[] = [
  {
    name: "Inglostand",
    country: "Germany",
    rooms: [
      { name: "Age", anydesk: "889 633 040" },
      { name: "Silent", anydesk: "934 906 596" },
      { name: "Silent VIDEO", anydesk: "316 864 098" },
      { name: "Upside", anydesk: "1 341 138 451", notes: "(197 184 116)" }
    ]
  },
  {
    name: "Munich",
    country: "Germany",
    rooms: [
      { name: "Indiana", anydesk: "1 138 345 577", notes: "(oldRpi):782 930 582" },
      { name: "Dracula", anydesk: "1 074 504 037", notes: "(oldRpi):446 461 720" },
      { name: "School", anydesk: "1 788 397 638", notes: "(oldRpi):371 721 962" },
      { name: "Pharaoh", anydesk: "1 275 569 122", notes: "(oldRpi):158 558 909" },
      { name: "Dead", anydesk: "1 772 69 3458", notes: "(oldRpi):206 722 962" },
      { name: "Dracula VIDEO", anydesk: "814 254 381" },
      { name: "Davinci", anydesk: "1 884 158 266" }
    ]
  },
  {
    name: "Heilbronn",
    country: "Germany",
    rooms: [
      { name: "Baker", anydesk: "1 696 199 042" },
      { name: "Evil", anydesk: "999 563 925" },
      { name: "Upside", anydesk: "1 282 524 867", notes: "(1 908 251 569)" },
      { name: "Prison", anydesk: "573 382 713" },
      { name: "Dracula", anydesk: "1 162 919 189" },
      { name: "Pharaoh", anydesk: "504 370 406" },
      { name: "Bar", anydesk: "375 981 965" },
      { name: "EVIL-Video", ip: "192.168.178.135", anydesk: "192.168.178.135", notes: "VideoPins:20,21 #16,26" },
      { name: "EVIL-Video WebSocket", anydesk: "1 833 176 695", notes: "should make it work with Websockets" }
    ]
  },
  {
    name: "Manheim",
    country: "Germany",
    rooms: [
      { name: "Prison", anydesk: "589 764 141", ip: "192.168.2.221" },
      { name: "Dracula", anydesk: "1 730 124 307", ip: "DHCP" },
      { name: "Aladdin", anydesk: "231 364 992", ip: "192.168.2.226" },
      { name: "Indiana", anydesk: "529 999 826", ip: "192.168.2.225" },
      { name: "Manheim-GM", anydesk: "168 746 117" },
      { name: "Exorcism-GM", anydesk: "1 994 043 282" },
      { name: "Exorcism", anydesk: "1 711 381 450" },
      { name: "Exorcism-Video1", anydesk: "1 939 284 190" },
      { name: "Exorcism-Video2", anydesk: "1 638 885 606" },
      { name: "Alice", anydesk: "952 260 598" },
      { name: "ALice - GM", anydesk: "1 937 315 986" },
      { name: "Upside", anydesk: "444 327 535" },
      { name: "Upside - GM", anydesk: "1 077 841 021" }
    ]
  },
  {
    name: "Tsimiski",
    country: "Greece",
    rooms: [
      { name: "Dracula", anydesk: "1 033 757 954", notes: "#611 945 069" },
      { name: "Dracula VIDEO", anydesk: "654 896 099" },
      { name: "Silent", anydesk: "542 418 617", ip: "192.168.0.2" },
      { name: "Silent (Alt)", anydesk: "400 783 230" },
      { name: "Evil", anydesk: "700 681 425", ip: "192.168.0.1" },
      { name: "Prison", anydesk: "818 107 939", notes: "Pass:@intelligent@" },
      { name: "Hostel", anydesk: "1 180 625 962" },
      { name: "Davinci", anydesk: "933 558 996" },
      { name: "Aladdin", anydesk: "868 452 117", notes: "Pass:mindtr@p" },
      { name: "Hostel VIDEO", anydesk: "847 240 825", ip: "192.168.10.100" },
      { name: "Hostel Music", anydesk: "745 304 507", ip: "192.168.10.108" }
    ]
  },
  {
    name: "Wurzburg",
    country: "Germany",
    rooms: [
      { name: "Dead", anydesk: "922 326 321" },
      { name: "Pirates", anydesk: "899 736 322" }
    ]
  },
  {
    name: "Ulm",
    country: "Germany",
    rooms: [
      { name: "Dracula", anydesk: "728 620 880", ip: "192.168.42.169" },
      { name: "Dracula VIDEO", anydesk: "794 325 416" },
      { name: "Upside", anydesk: "877341376" },
      { name: "Hostel", anydesk: "1 394 348 807" },
      { name: "Hostel-GM", anydesk: "830 086 816" },
      { name: "School", anydesk: "193 878 207" },
      { name: "School -GM", anydesk: "1 175 792 647" }
    ]
  },
  {
    name: "Karslue",
    country: "Germany",
    rooms: [
      { name: "Jumanchi", anydesk: "618 843 357", notes: "(1 028 720 414)" },
      { name: "Baker", anydesk: "775 612 529" },
      { name: "Karslue", anydesk: "603 780 392" },
      { name: "Atlantis", anydesk: "603 780 392" }
    ]
  },
  {
    name: "Rostock",
    country: "Germany",
    rooms: [
      { name: "Davinci", anydesk: "1 571 522 198" },
      { name: "Dracula", anydesk: "232 661 379" },
      { name: "Prison", anydesk: "1 945 127 750", notes: "(Magazi 1?)" },
      { name: "Prison-GM", anydesk: "1 358 604 269" },
      { name: "Prison (Magazi 2)", anydesk: "1 388 577 567", notes: "(Magazi 2 ?)" },
      { name: "Prison-GM (Magazi 2)", anydesk: "1 137 684 850" }
    ]
  },
  {
    name: "Bencheim",
    country: "Germany",
    rooms: [
      { name: "Evil", anydesk: "839 874 952" },
      { name: "Pharaoh", anydesk: "1 737 160 404", notes: "//106 903 032" },
      { name: "Baker-GM", anydesk: "1 093 726 370" },
      { name: "Baker", anydesk: "1 070 688 756" }
    ]
  },
  {
    name: "Frehen",
    country: "Germany",
    rooms: [
      { name: "School", anydesk: "1 619 168 073", ip: "192.168.33.221" }
    ]
  },
  {
    name: "Voni",
    country: "Germany",
    rooms: [
      { name: "Dracula", anydesk: "308 920 260" },
      { name: "Upside", anydesk: "245 046 902" }
    ]
  },
  {
    name: "Fraibourg",
    country: "Germany",
    rooms: [
      { name: "Aladdin", anydesk: "337 074 638" },
      { name: "GM-PC", anydesk: "272 099 656" },
      { name: "AlladinMiniPC", anydesk: "1059987090" }
    ]
  },
  {
    name: "Kaiserslauten",
    country: "Germany",
    rooms: [
      { name: "Dead", anydesk: "1 600 257 487" },
      { name: "Davinci", anydesk: "303 168 574", ip: "192.168.11.242" },
      { name: "Pharaoh", anydesk: "733 552 408" },
      { name: "GM-PC", anydesk: "845 370 001" },
      { name: "GM-PC-Cardreader", anydesk: "968 001 771" },
      { name: "Baker", anydesk: "186 124 797", ip: "192.168.14.241", notes: "ID:92782126 PS:20447" },
      { name: "Upside", anydesk: "299 317 887", ip: "192.168.14.242" },
      { name: "Dracula", anydesk: "804 642 039", ip: "192.168.14.243", notes: "ID:92783621 PS:09894" },
      { name: "School", anydesk: "766 086 890", ip: "192.168.14.244" },
      { name: "Cameras", anydesk: "618 678 616" },
      { name: "GM-PC (Main)", anydesk: "290 369 863" }
    ]
  },
  {
    name: "Solingen",
    country: "Germany",
    rooms: [
      { name: "Ageofknights", anydesk: "573 084 930", notes: "ageofknights.local" },
      { name: "Baker", anydesk: "651 384 568", notes: "bakerstreet.local" },
      { name: "Indiana", anydesk: "160 905 986", notes: "templeofdoom.local" },
      { name: "Pharaoh", anydesk: "272 065 207", notes: "pharaostomb.local" },
      { name: "Prison", anydesk: "369 771 082", notes: "prisonbreak.local" },
      { name: "Upside", anydesk: "573 061 470", notes: "upsidedown.local" }
    ]
  },
  {
    name: "Hildesheim",
    country: "Germany",
    rooms: [
      { name: "Aladdin", anydesk: "969 593 407", ip: "192.168.178.241", notes: "iealaddin.local" },
      { name: "Pharaoh", anydesk: "467 992 319", ip: "192.168.178.242", notes: "iepharaoh.local" }
    ]
  },
  {
    name: "Hamm",
    country: "Germany",
    rooms: [
      { name: "Upside", anydesk: "925 273 800", ip: "192.168.178.241", notes: "ieupside.local" }
    ]
  },
  {
    name: "Wultzuburg",
    country: "Germany",
    rooms: [
      { name: "Evil", anydesk: "724 495 629", ip: "192.168.178.241", notes: "ieevil.local" }
    ]
  },
  {
    name: "Anovero",
    country: "Germany",
    rooms: [
      { name: "Dracula", anydesk: "241 570 770", ip: "192.168.178.241", notes: "iedracula.local" },
      { name: "Hostel", anydesk: "840 887 711", ip: "192.168.178.242", notes: "iehostel.local" },
      { name: "Hostel-Video", anydesk: "278 960 822" }
    ]
  },
  {
    name: "Cosmos",
    country: "Germany",
    rooms: [
      { name: "Atlantis", anydesk: "597 079 804", ip: "192.168.0.7" },
      { name: "GM-PC", anydesk: "142 545 035" },
      { name: "Alice", anydesk: "1 376 747 505" },
      { name: "Alice-GM", anydesk: "1 630 622 468" },
      { name: "Jumanji", anydesk: "1 135 414 133" },
      { name: "Jumanji-GM", anydesk: "1 629 435 454" },
      { name: "Atlantis (Alt)", anydesk: "1 336 825 409" },
      { name: "Atlantis-GM", anydesk: "1 767 450 955" },
      { name: "Hansel", anydesk: "1 873 727 837" },
      { name: "Hansel-GM", anydesk: "1 173 397 057" },
      { name: "Alice - Big Screen", anydesk: "1 726 630 927" },
      { name: "Alice - Small Screen", anydesk: "1 518 706 129" },
      { name: "Hostel - Video", anydesk: "1 191 307 086" },
      { name: "Hostel - Music", anydesk: "1 741 321 715" }
    ]
  },
  {
    name: "Elvetia-Zirixi",
    country: "Switzerland",
    rooms: [
      { name: "Age of knights (Raspberry)", anydesk: "431 777 280" },
      { name: "Indiana (Raspberry)", anydesk: "213 594 957" },
      { name: "Indiana (Mini PC)", anydesk: "697 573 372" },
      { name: "Age of knights (Mini PC)", anydesk: "964 415 583" }
    ]
  },
  {
    name: "Koverstain",
    country: "Germany",
    rooms: [
      { name: "Pharaoh", anydesk: "1 176 375 705" },
      { name: "Middle-GM", anydesk: "1 547 042 271" },
      { name: "Middle", anydesk: "1 800 497 415" },
      { name: "Middle-Video", anydesk: "1 945 128 813" }
    ]
  },
  {
    name: "Rodgau",
    country: "Germany",
    rooms: [
      { name: "Davinci", anydesk: "216 801 029" },
      { name: "Dracula", anydesk: "320 504 383" },
      { name: "Prison", anydesk: "642 541 794" },
      { name: "Exorcist", anydesk: "238 512 541", notes: "740 570 405" },
      { name: "School", anydesk: "335 748 899" },
      { name: "Atlantis", anydesk: "520 273 700" },
      { name: "GM-1", anydesk: "956 030 370" },
      { name: "GM-2", anydesk: "534 736 304" },
      { name: "GM-3", anydesk: "1 166970675" },
      { name: "CAM-1", anydesk: "737 843 754" },
      { name: "CAM-2", anydesk: "344 736 624" },
      { name: "Video-1", anydesk: "114 034 195", notes: "Demons" },
      { name: "Video-2", anydesk: "745 984 395", notes: "Virgin" }
    ]
  },
  {
    name: "Landau",
    country: "Germany",
    rooms: [
      { name: "Orient", anydesk: "1 615 170 785" },
      { name: "Silent", anydesk: "1 443 243 331" },
      { name: "Dracula", anydesk: "1 259 033 095", notes: "Not set Unattended Access" },
      { name: "Middle", anydesk: "1 572 583 934" },
      { name: "Landau Backleft", anydesk: "972 949 938" },
      { name: "Landau Backright", anydesk: "1 822 857 593" },
      { name: "Landau Frontright", anydesk: "1 134 138 674" },
      { name: "Landau Frontleft", anydesk: "1 523 395 652" },
      { name: "Landau MiddleVideo", anydesk: "1 018 277 577" },
      { name: "Landau GM Orient", anydesk: "1 774 735 297" },
      { name: "Landau GM", anydesk: "1 942 273 933" },
      { name: "Landau GM (Alt)", anydesk: "1 170 684 116" },
      { name: "Landau Cameras", anydesk: "1 082 802 611" }
    ]
  },
  {
    name: "Darmstand",
    country: "Germany",
    rooms: [
      { name: "Jumanchi", anydesk: "211 078 266" },
      { name: "Upside", anydesk: "195 599 889" },
      { name: "Orient", anydesk: "1 324 169 966" },
      { name: "Middle", anydesk: "1 670 476 889" },
      { name: "Hostel", anydesk: "1 219 845 069" },
      { name: "Darmstand Backright", anydesk: "1836569148" },
      { name: "Darmstand Backleft", anydesk: "1908296798" },
      { name: "Darmstand Frontright", anydesk: "1319249940" },
      { name: "Darmstand Frontleft", anydesk: "1856854641" },
      { name: "Hostel Video", anydesk: "245126355" },
      { name: "Hostel Music", anydesk: "1206301950" },
      { name: "Darmstand MiddleVideo", anydesk: "1581273619" },
      { name: "GM-1", anydesk: "1089891131" },
      { name: "GM-2", anydesk: "1472159924" },
      { name: "GM-3", anydesk: "1506532067", notes: "Cameras" }
    ]
  },
  {
    name: "Colorado",
    country: "USA",
    rooms: [
      { name: "Indiana", anydesk: "304539199" },
      { name: "Atlantis", anydesk: "204331398" },
      { name: "GM1", anydesk: "1 535 261 536", notes: "Atlantis" },
      { name: "GM2", anydesk: "737 127 918", notes: "Indiana" },
      { name: "GM3", anydesk: "461 799 720", notes: "New-Indiana" }
    ]
  },
  {
    name: "Florida",
    country: "USA",
    rooms: [
      { name: "Silent", anydesk: "1 443 243 331" },
      { name: "Silent-GM", anydesk: "1 572 583 934" },
      { name: "Atlantis", anydesk: "1 494 148 945" },
      { name: "Indiana", anydesk: "1 615 800 389" },
      { name: "Dracula", anydesk: "1 965 709 776" },
      { name: "Aladdin", anydesk: "1 907 144 873", notes: "(1066781995)" },
      { name: "Upside", anydesk: "1 070 702 134" },
      { name: "Silent (Main)", anydesk: "1 317 681 953" },
      { name: "Dracula-GM", anydesk: "1 981 339 272" },
      { name: "Aladdin-GM", anydesk: "628 338 244" },
      { name: "Indiana-GM", anydesk: "1 500 718 521" },
      { name: "Silent-GM", anydesk: "1 679 862 393" },
      { name: "Upside-GM", anydesk: "362 062 441" },
      { name: "Atlantis-GM", anydesk: "1 459 481 407" }
    ]
  },
  {
    name: "Troisdorf",
    country: "Germany",
    rooms: [
      { name: "Hostel-Video", anydesk: "1 559 251 439" },
      { name: "Hostel-Music", anydesk: "1 486 947 720" },
      { name: "Hostel", anydesk: "1 738 088 500", notes: "(1607684489)" },
      { name: "Aladdin", anydesk: "1 497 145 611" },
      { name: "Upside", anydesk: "1 561 572 265" },
      { name: "GM-Upside", anydesk: "1366307544" },
      { name: "GM-Aladdin", anydesk: "1975140549" },
      { name: "GM-Hostel", anydesk: "1483827403" }
    ]
  },
  {
    name: "Bautzen",
    country: "Germany",
    rooms: [
      { name: "School", anydesk: "1 660 725 436" },
      { name: "Atlantis", anydesk: "1 310 587 262" }
    ]
  },
  {
    name: "Ekthesi",
    country: "Greece",
    rooms: [
      { name: "AF Server", anydesk: "1 402 590 252" },
      { name: "AF Registration", anydesk: "1 729 092 512" },
      { name: "AF Joker", anydesk: "1 250 674 483" },
      { name: "AF Hightlitbars", anydesk: "1 792 636 319" },
      { name: "AF Spectrumdice", anydesk: "982 817 269" },
      { name: "AF-Administration", anydesk: "1 688 369 452" },
      { name: "Scoreboard AgentFactory", anydesk: "1 937 203 575" },
      { name: "AF Scoreboard2", anydesk: "883 791 053" }
    ]
  },
  {
    name: "Australia",
    country: "Australia",
    rooms: [
      { name: "Hostel-Video", anydesk: "1 074 601 678" },
      { name: "Hostel-Music", anydesk: "1 235 355 098" },
      { name: "Hostel", anydesk: "1 907 711 637" },
      { name: "Hostel-GM", anydesk: "1 181 342 716" },
      { name: "Indiana", anydesk: "1 646 128 459" },
      { name: "Indiana-GM", anydesk: "1 415 849 059" },
      { name: "Prison", anydesk: "1 871 794 304" },
      { name: "Prison-GM", anydesk: "1 984 438 587" },
      { name: "School", anydesk: "1 330 279 763" },
      { name: "School-GM", anydesk: "1 168 337 390" },
      { name: "Spare", anydesk: "1 529 967 327" }
    ]
  },
  {
    name: "Leverkusen",
    country: "Germany",
    rooms: [
      { name: "Dracula-GM", anydesk: "1 409 585 221" },
      { name: "Dracula", anydesk: "1 983 724 647" },
      { name: "Silent Hills-GM", anydesk: "1 686 471 410" },
      { name: "Silent Hills", anydesk: "1 136 565 268" },
      { name: "Aladdin-GM", anydesk: "173 107 625" },
      { name: "Aladdin", anydesk: "1 244 192 180" }
    ]
  },
  {
    name: "Nuremberg",
    country: "Germany",
    rooms: [
      { name: "Middle-Video", anydesk: "1 953 722 678" },
      { name: "GM Middle", anydesk: "1 482 876 901" },
      { name: "GM Atlantis", anydesk: "1 585 856 185" },
      { name: "Atlantis", anydesk: "1 516 729 715" },
      { name: "Middle Earth", anydesk: "1 824 690 077" }
    ]
  },
  {
    name: "Gera",
    country: "Germany",
    rooms: [
      { name: "Dracula", anydesk: "1 881 996 475" },
      { name: "Pharaoh", anydesk: "1 019 412 473" },
      { name: "Baker", anydesk: "1 742 370 253" },
      { name: "Gera-GM", anydesk: "1 034 378 879" }
    ]
  },
  {
    name: "Lisbon",
    country: "Portugal",
    rooms: [
      { name: "Unknown", anydesk: "1 605 195 555" },
      { name: "Maybe OLD Anydesk", anydesk: "1 895 944 201", notes: "Upside Down-GM" },
      { name: "Upside Down", anydesk: "1 802 147 727" },
      { name: "Upside Down-GM", anydesk: "528 318 166" },
      { name: "School-GM", anydesk: "1 854 786 907" },
      { name: "School", anydesk: "1 029 847 176" }
    ]
  },
  {
    name: "Canada",
    country: "Canada",
    rooms: [
      { name: "Aladdin-GM", anydesk: "1 441 351 959" },
      { name: "Aladdin", anydesk: "1 010 717 855" }
    ]
  },
  {
    name: "Neulm",
    country: "Germany",
    rooms: [
      { name: "Hostel-GM", anydesk: "830 086 816" },
      { name: "Hostel", anydesk: "1 394 348 807" },
      { name: "Hostel-Video", anydesk: "1 973 224 514" },
      { name: "Hostel-Music", anydesk: "1 710 133 385" }
    ]
  },
  {
    name: "Trier",
    country: "Germany",
    rooms: [
      { name: "Upside-GM", anydesk: "1 378 863 852" },
      { name: "Upside", anydesk: "1 431 384 083" },
      { name: "Orient", anydesk: "1 668 358 672" },
      { name: "Alice", anydesk: "1 841620 689" },
      { name: "Orient - GM", anydesk: "1 524 695 902" },
      { name: "Alice - GM", anydesk: "1 468 856 610" }
    ]
  },
  {
    name: "Paris",
    country: "France",
    rooms: [
      { name: "Jumanji", anydesk: "1 468 072 342" },
      { name: "Atlantis", anydesk: "1 702 178 162" },
      { name: "Atlantis-GM", anydesk: "1 525 776 028" },
      { name: "Orient", anydesk: "1 477 683 556" },
      { name: "Frontleft", anydesk: "1 061 731 099" },
      { name: "Backleft", anydesk: "1 237 683 820" },
      { name: "Frontright", anydesk: "1 137 596 807" },
      { name: "Backright", anydesk: "1 079 898 926" }
    ]
  },
  {
    name: "Luxembourg",
    country: "Luxembourg",
    rooms: [
      { name: "Upside", anydesk: "1 446 438 645" },
      { name: "Upside-GM", anydesk: "1 455 682 659" },
      { name: "Dracula", anydesk: "1 868 649 755" },
      { name: "Dracula-GM", anydesk: "1 675 911 173" },
      { name: "Da Vinci", anydesk: "1 807 681 674" },
      { name: "Da Vinci-GM", anydesk: "1 635 080 844" },
      { name: "Baker", anydesk: "1 956 521 660" },
      { name: "Baker-GM", anydesk: "1 798 693 186" }
    ]
  },
  {
    name: "Emden",
    country: "Germany",
    rooms: [
      { name: "Da Vinci", anydesk: "1 426 341 336" },
      { name: "Da Vinci-GM", anydesk: "883 452 054" },
      { name: "Dracula", anydesk: "1 080 025 448" },
      { name: "Dracula-GM", anydesk: "110 441 440" }
    ]
  },
  {
    name: "Aristotelous",
    country: "Greece",
    rooms: [
      { name: "Middle", anydesk: "1 635 440 646" },
      { name: "Hostel", anydesk: "1 144 953 897" },
      { name: "Wednesday", anydesk: "1 052 646 941" },
      { name: "Exosrcism", anydesk: "1 428 325 147", notes: "(1 622 852 284)" },
      { name: "Prison", anydesk: "1 290 226 771" },
      { name: "Curse of the Mummy", anydesk: "1 297 643 299" },
      { name: "Orient", anydesk: "1 465 358 901" },
      { name: "Aladdin", anydesk: "1 131 557 171" },
      { name: "Money Heist", anydesk: "1 791 901 804" },
      { name: "Γραμματεία", anydesk: "1 992 650 091" },
      { name: "Info-Kiosk_1", anydesk: "1 891 185 911" },
      { name: "Info-Kiosk_2", anydesk: "1 746 390 440" },
      { name: "GM_1", anydesk: "1 302 271 998" },
      { name: "GM_2", anydesk: "1 628 214 778" },
      { name: "GM_3", anydesk: "1 657 257 172" },
      { name: "GM_4", anydesk: "1 175 139 359" },
      { name: "GM_5", anydesk: "1 952 695 227" },
      { name: "GM_6", anydesk: "1 734 484 779" },
      { name: "Cams_1", anydesk: "1 308 831 489" },
      { name: "Cams_2", anydesk: "1 342 165 769" },
      { name: "Cams_3", anydesk: "1 176 345 757" },
      { name: "Cams_4", anydesk: "1 667 323 116" },
      { name: "Sound", anydesk: "1 918 802 621" },
      { name: "Orient-Backleft", anydesk: "1 249 580 717" },
      { name: "Orient-Backright", anydesk: "1 958 571 903" },
      { name: "Orient-Frontright", anydesk: "263 450 469" },
      { name: "Orient-Frontleft", anydesk: "1 750 913 505", notes: "Δεν ειναι Online" },
      { name: "Middle-Fountain", anydesk: "1 675 201 883" },
      { name: "Hostel-Video", anydesk: "1 893 551 547" },
      { name: "Hostel-Music", anydesk: "1 602 182 288" },
      { name: "Exorcism-Video-1", anydesk: "1 770 878 609" },
      { name: "Exorcism-Video-2", anydesk: "352 569 396" },
      { name: "Nevermore-Portrait", anydesk: "1 407 548 244" },
      { name: "Nevermore-Questions", anydesk: "1 294 635 108" },
      { name: "Nevermore-Emf-1", anydesk: "1 582 862 080" },
      { name: "Nevermore-Emf-2", anydesk: "1 502 920 637" },
      { name: "Nevermore-Emf-3", anydesk: "1 893 537 879" },
      { name: "Nevermore-Emf-4", anydesk: "1 755 919 214" }
    ]
  },
  {
    name: "Leipzig",
    country: "Germany",
    rooms: [
      { name: "Atlantis", anydesk: "486 497 524" },
      { name: "Atlantis-GM", anydesk: "1 351 547 086" },
      { name: "School", anydesk: "1 042 661 094" },
      { name: "School-GM", anydesk: "1 870 991 978" },
      { name: "Alice", anydesk: "1 698 122 680" },
      { name: "Alice-GM", anydesk: "1 192 968 013" },
      { name: "Alice-Video-BigScreen", anydesk: "134 099 085" },
      { name: "Alice-Video-SmallScreen", anydesk: "1 316 714 030" }
    ]
  },
  {
    name: "IAAPA-Orlando",
    country: "USA",
    rooms: [
      { name: "Middle", anydesk: "1 742 370 253" },
      { name: "Atlantis", anydesk: "106 895 589" },
      { name: "Middle-GM", anydesk: "629 052 439" },
      { name: "Atlantis-GM", anydesk: "1 740 672 682" },
      { name: "Mg-Server", anydesk: "1 337 408 761" },
      { name: "Mg-Admin", anydesk: "1 167 265 018" },
      { name: "Agent-Registration", anydesk: "1 267 582 333" },
      { name: "Agent-Admin", anydesk: "1 638 815 185" },
      { name: "Backoffice-1", anydesk: "1 798 283 338" },
      { name: "Backoffice-2", anydesk: "1 913 275 272" },
      { name: "Backoffice-3", anydesk: "1 949 020 895" },
      { name: "Clown-Strike", anydesk: "1 485 276 376" },
      { name: "Scoreboard", anydesk: "1 003 471 721" },
      { name: "FillTheGap-panel", anydesk: "1 914 275 846" },
      { name: "FillTheGap-monitors", anydesk: "1 015 275 287" },
      { name: "Reflections-panel", anydesk: "1 828 663 971" },
      { name: "Reflections-monitors", anydesk: "1 790 468 395" },
      { name: "Joker-panel", anydesk: "1 159 352 380" },
      { name: "Joker-monitors", anydesk: "1 324 203 737" },
      { name: "Agent-server", anydesk: "1 830 528 240" },
      { name: "Spare(Dell)", anydesk: "1 823 668 619" },
      { name: "Spare-2(Kineziko)", anydesk: "809 257 712" }
    ]
  },
  {
    name: "IAAPA-Amsterdam",
    country: "Netherlands",
    rooms: [
      { name: "Middle", anydesk: "1 886 749 689" },
      { name: "Atlantis", anydesk: "1 219 382 353" },
      { name: "Middle-GM", anydesk: "1 182 571 406" },
      { name: "Atlantis-GM", anydesk: "1 341 138 451" },
      { name: "Mg-Server", anydesk: "1 417 349 321" },
      { name: "Mg-Admin", anydesk: "1 956 747 124" },
      { name: "Agent-Registration", anydesk: "1 864 057 876" },
      { name: "Agent-Admin", anydesk: "1 114 328 763" },
      { name: "Backoffice-1", anydesk: "1 276 374 493" },
      { name: "Backoffice-2", anydesk: "1 392 408 649" },
      { name: "Backoffice-3", anydesk: "1 371 402 844" },
      { name: "Clown-Strike", anydesk: "1 077 434 628" },
      { name: "Scoreboard", anydesk: "1 519 751 823" },
      { name: "FillTheGap-panel", anydesk: "251 824 960" },
      { name: "FillTheGap-monitors", anydesk: "1 494 986 535" },
      { name: "Reflections-panel", anydesk: "1 588 176 662" },
      { name: "Reflections-monitors", anydesk: "1 622 852 284" },
      { name: "Joker-panel", anydesk: "1 370 959 970" },
      { name: "Joker-monitors", anydesk: "1 986 824 320" },
      { name: "Agent-server", anydesk: "1 713 583 499" },
      { name: "Spare(Dell)", anydesk: "1 499 698 997" },
      { name: "Spare-2(Kineziko)", anydesk: "1 479 183 383" }
    ]
  },
  {
    name: "Reutlingen",
    country: "Germany",
    rooms: [
      { name: "Davinci", anydesk: "1 057 247 054", ip: "192.168.0.92" },
      { name: "Davinci-GM", anydesk: "1 880 878 017" },
      { name: "Indiana", anydesk: "1 609 063 501", ip: "192.168.0.93" },
      { name: "Indiana-GM", anydesk: "1 411 307 231" },
      { name: "Hostel", anydesk: "1 410 986 890", ip: "192.168.0.94" },
      { name: "Hostel-GM", anydesk: "1 860 029 967" },
      { name: "Atlantis", anydesk: "1 110 110 712", ip: "192.168.0.95" },
      { name: "Atlantis-GM", anydesk: "1 283 116 350" },
      { name: "Hostel-Video", anydesk: "1 972 579 000" },
      { name: "Hostel-Music", anydesk: "1 749 035 647" },
      { name: "Cameras", anydesk: "192.168.0.71 - 192.168.0.82", ip: "192.168.0.71-82" }
    ]
  },
  {
    name: "Louisiana",
    country: "USA",
    rooms: [
      { name: "Indiana", anydesk: "589 818 152" },
      { name: "Indiana-GM", anydesk: "1 324 337 119" },
      { name: "Age of Knights", anydesk: "1 886 749 689" },
      { name: "Age of Knights-GM", anydesk: "1 182 571 406" }
    ]
  },
  {
    name: "Augsburg",
    country: "Germany",
    rooms: [
      { name: "School", anydesk: "1 114 328 763" },
      { name: "School-GM", anydesk: "1 864 057 876" },
      { name: "Dracula", anydesk: "1 956 747 124" },
      { name: "Dracula-GM", anydesk: "1 077 434 628" }
    ]
  },
  {
    name: "Schwabisch-Hall",
    country: "Germany",
    rooms: [
      { name: "School", anydesk: "1 405 802 638", notes: "(933 031 906)" },
      { name: "School-GM", anydesk: "1 363 548 779" },
      { name: "Hostel", anydesk: "1 621 580 729" },
      { name: "Hostel-GM", anydesk: "1 668 850 133" },
      { name: "Hostel-Video", anydesk: "1 647 918 391" },
      { name: "Hostel-Music", anydesk: "1 306 707 986" }
    ]
  },
  {
    name: "Belfast",
    country: "UK",
    rooms: [
      { name: "Indiana", anydesk: "1 472 897 671" },
      { name: "Indiana-GM", anydesk: "1 913 275 272" },
      { name: "Upside", anydesk: "1 167 265 018" },
      { name: "Upside-GM", anydesk: "1 949 020 895" },
      { name: "Exorcism", anydesk: "1 798 283 338" },
      { name: "Exorcism-GM", anydesk: "1 638 815 185" },
      { name: "Age of Knights-GM", anydesk: "1 267 582 333" },
      { name: "Madonna - Video", anydesk: "1 684 416 430" },
      { name: "Demons - Video", anydesk: "1 308 506 530" }
    ]
  },
  {
    name: "Lucerne",
    country: "Switzerland",
    rooms: [
      { name: "Indiana", anydesk: "1 942 909 895" },
      { name: "Hostel", anydesk: "1 779 919 205" },
      { name: "Dracula", anydesk: "1 849 254 483" },
      { name: "Davinci", anydesk: "1 521 957 627" },
      { name: "Upside", anydesk: "1 182 245 728" },
      { name: "Cursed", anydesk: "1 958 154 720" },
      { name: "Prison", anydesk: "1 911 064 335" },
      { name: "Davinci-GM", anydesk: "546 583 880" },
      { name: "Upside-GM", anydesk: "1 521 685 932" },
      { name: "Hostel-GM", anydesk: "1 733 294 488" },
      { name: "Prison-GM", anydesk: "1 977 975 016" },
      { name: "Cursed-GM (CAMERAS 1)", anydesk: "1 114 238 649" },
      { name: "Dracula-GM (CAMERAS 2)", anydesk: "1 254 346 679" }
    ]
  },
  {
    name: "Boston",
    country: "USA",
    rooms: [
      { name: "Atlantis", anydesk: "1 740 672 682" }
    ]
  },
  {
    name: "Elvetia Obfelden",
    country: "Switzerland",
    rooms: [
      { name: "Atlantis", anydesk: "1 640 893 987" },
      { name: "Alice", anydesk: "1 491 889 494" },
      { name: "Atlantis-Video", anydesk: "1 031 708 584" },
      { name: "Alice-Big", anydesk: "734 472 152" },
      { name: "Alice-Small", anydesk: "793 306 469" }
    ]
  },
  {
    name: "France Eragny",
    country: "France",
    rooms: [
      { name: "Dracula", anydesk: "1 654 984 117" },
      { name: "Dracula-GM", anydesk: "1 913 329 583" }
    ]
  },
  {
    name: "France Velizy",
    country: "France",
    rooms: [
      { name: "Dracula", anydesk: "104 489 932" },
      { name: "Dracula-GM", anydesk: "1 967 277 520" }
    ]
  }
];

// Helper function to get unique countries
export const getCountries = (): string[] => {
  const countries = [...new Set(roomData.map(city => city.country))];
  return countries.sort();
};

// Helper function to get cities by country
export const getCitiesByCountry = (country: string): CityData[] => {
  return roomData.filter(city => city.country === country).sort((a, b) => a.name.localeCompare(b.name));
};

// Helper function to get city data by name
export const getCityByName = (cityName: string): CityData | undefined => {
  return roomData.find(city => city.name === cityName);
};