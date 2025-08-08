#!/bin/bash

# Boniteti.me Parallel Data Scraper
# Skripta za paralelno skrepovanje sa podesivim brojem agenata

# Boje za lakši output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfiguracija
NUM_AGENTS=5  # Default broj agenata
TAKE_PER_REQUEST=50  # Koliko redova po zahtevu
DELAY_BETWEEN_REQUESTS=1  # Sekunde između zahteva
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_DIR="boniteti-data-parallel-${TIMESTAMP}"
TEMP_DIR="${OUTPUT_DIR}/temp"
LOGS_DIR="${OUTPUT_DIR}/logs"
RESULTS_DIR="${OUTPUT_DIR}/results"

# Session cookies
COOKIES='_ga=GA1.2.1718927108.1754616016; _gid=GA1.2.1197884477.1754616016; Boniteti.me.Test=; ASP.NET_SessionId=tkebso4v3hnqgpgqz2lmma4a; Boniteti.me.UserCheck=6F88B9041376C77AAEE47841A835C38C; __zlcmid=1T2np6ChUR83tiZ; _ga_7CREWL27TX=GS2.2.s1754616016$o1$g1$t1754616966$j41$l0$h0'

# Parametri pretrage
PARAMS='sp%5BcompanyName%5D=&sp%5BfoundingDateFrom%5D=&sp%5BfoundingDateTo%5D=&sp%5BexportDateFrom%5D=&sp%5BexportDateTo%5D=&sp%5BimportDateFrom%5D=&sp%5BimportDateTo%5D=&sp%5BcompanyCountry%5D=Crna+Gora&sp%5BcompanyActivityCode%5D%5B%5D=A+-+POLjOPRIVREDA%2C+%C5%A0UMARSTVO+I+RIBARSTVO&sp%5BcompanyActivityCode%5D%5B%5D=B+-+RUDARSTVO&sp%5BcompanyActivityCode%5D%5B%5D=C+-+PRERA%C4%90IVA%C4%8CKA+INDUSTRIJA&sp%5BcompanyActivityCode%5D%5B%5D=D+-+SNABDEVANjE+ELEKTRI%C4%8CNOM+ENERGIJOM%2C+GASOM%2C+PAROM+I+KLIMATIZACIJA&sp%5BcompanyActivityCode%5D%5B%5D=E+-+SNABDEVANjE+VODOM%3B+UPRAVLjANjE+OTPADNIM+VODAMA%2C+KONTROLISANjE+PROCESA+UKLANjANjA+OTPADA+I+SLI%C4%8CNE+AKTIVNOSTI&sp%5BcompanyActivityCode%5D%5B%5D=F+-+GRA%C4%90EVINARSTVO&sp%5BcompanyActivityCode%5D%5B%5D=G+-+TRGOVINA+NA+VELIKO+I+TRGOVINA+NA+MALO%3B+POPRAVKA+MOTORNIH+VOZILA+I+MOTOCIKALA&sp%5BcompanyActivityCode%5D%5B%5D=H+-+SAOBRA%C4%86AJ+I+SKLADI%C5%A0TENjE&sp%5BcompanyActivityCode%5D%5B%5D=I+-+USLUGE+PRU%C5%BDANjA+SMjE%C5%A0TAJA+I+ISHRANE&sp%5BcompanyActivityCode%5D%5B%5D=J+-+INFORMISANjE+I+KOMUNIKACIJE&sp%5BcompanyActivityCode%5D%5B%5D=K+-+FINANSIJSKE+DjELATNOSTI+I+DjELATNOST+OSIGURANjA&sp%5BcompanyActivityCode%5D%5B%5D=L+-+POSLOVANjE+NEKRETNINAMA&sp%5BcompanyActivityCode%5D%5B%5D=M+-+STRU%C4%8CNE%2C+NAU%C4%8CNE+I+TEHNI%C4%8CKE+DjELATNOSTI&sp%5BcompanyActivityCode%5D%5B%5D=N+-+ADMINISTRATIVNE+I+POMO%C4%86NE+USLU%C5%BDNE+DjELATNOSTI&sp%5BcompanyActivityCode%5D%5B%5D=O+-+DR%C5%BDAVNA+UPRAVA+I+ODBRANA%3B+OBAVEZNO+SOCIJALNO+OSIGURANjE&sp%5BcompanyActivityCode%5D%5B%5D=P+-+OBRAZOVANjE&sp%5BcompanyActivityCode%5D%5B%5D=Q+-+ZDRAVSTVENA+I+SOCIJALNA+ZA%C5%A0TITA&sp%5BcompanyActivityCode%5D%5B%5D=R+-+UMjETNOST%2C+ZABAVA+I+REKREACIJA&sp%5BcompanyActivityCode%5D%5B%5D=S+-+OSTALE+USLU%C5%BDNE+DjELATNOSTI&sp%5BcompanySize%5D=&sp%5BcompanyLegalForm%5D=&sp%5BbudgetUser%5D=&sp%5BfounderName%5D=&sp%5BfounderCountry%5D=&sp%5BtrusteeName%5D=&sp%5BtrusteeCountry%5D=&sp%5BcompanyBonitetScore%5D=&sp%5BcompanyInsolvencyName%5D=&sp%5BinsolvencyDateFrom%5D=&sp%5BinsolvencyDateTo%5D=&sp%5BcompanyRegion%5D=&sp%5BcompanyPlace%5D=&sp%5BcompanyMunicipality%5D=&sp%5BcompanyPostalCode%5D=&sp%5BcompanyAddress%5D=&sp%5BcompanyLastFinReportYear%5D=2024&sp%5BcompanyFinReportCurrency%5D=EUR&sp%5BbranchName%5D=&sp%5BsalesIncomeFrom%5D=&sp%5BsalesIncomeTo%5D=&sp%5BcapitalFrom%5D=&sp%5BcapitalTo%5D=&sp%5BnetProfitFrom%5D=&sp%5BnetProfitTo%5D=&sp%5BnumberOfEmployeesFrom%5D=&sp%5BnumberOfEmployeesTo%5D=&sp%5BcompanyMultiSearch%5D=&sp%5BfinReportFormula%5D=&sp%5BorderByParameter%5D=revenue&sp%5BassetsFrom%5D=&sp%5BassetsTo%5D=&sp%5Bexporter%5D=&sp%5Bimporter%5D=&sp%5BexporterCountry%5D=&sp%5BimporterCountry%5D=&sp%5BimporterOriginCountry%5D=&sp%5BhasEmail%5D=&sp%5BhasPhone%5D=&sp%5BhasActiveCase%5D=&sp%5BhasClosedCase%5D=&sp%5BisCustomer%5D=&sp%5BregisteredOnNbs%5D=&sp%5BregisteredOnApr%5D=&sp%5BpaidCapitalTo%5D=&sp%5BpaidCapitalFrom%5D=&sp%5BnbsBillsBank%5D=&sp%5BnbsBillsBasicOfPublition%5D=&sp%5BaccountBank%5D=&sp%5BfirstIdicator%5D=&sp%5BsecondIdicator%5D=&sp%5BthirdIdicator%5D=&sp%5BthirdIdicatorTo%5D=&sp%5BthirdIdicatorFrom%5D=&sp%5BsecondIdicatorTo%5D=&sp%5BsecondIdicatorFrom%5D=&sp%5BfirstIdicatorTo%5D=&sp%5BfirstIdicatorFrom%5D=&sp%5BaccountDateOpenTo%5D=&sp%5BaccountDateOpenFrom%5D=&sp%5BaccountIsCovid%5D=&sp%5BblockDayInEver%5D=&sp%5BblockDayInOneYear%5D=&sp%5BblockDayInFourMonth%5D=&sp%5BblockDayInTwoMonth%5D=&sp%5BblockDayInOneMonth%5D=&sp%5BsubjectType%5D=&sp%5BtenderStatus%5D=&sp%5BcontractDateFrom%5D=&sp%5BcontractDateTo%5D=&sp%5BbillDateOfRegistrationFrom%5D=&sp%5BbillDateOfRegistrationTo%5D=&sp%5BleaseRegistrationDateFrom%5D=&sp%5BleaseRegistrationDateTo%5D=&sp%5BlastPaymentRateDateFrom%5D=&sp%5BlastPaymentRateDateTo%5D=&sp%5BleaseSubject%5D=&sp%5BdoesntHaveTrialsInMonths%5D=&sp%5BisBuyer%5D=&sp%5BisSupplier%5D=&sp%5BisLeaseBuyer%5D=&sp%5BisLeaseSupplier%5D=&sp%5BdoesntHaveTrials%5D=&sp%5BdoesntHaveExecutions%5D=&sp%5BriskScore%5D=&sp%5BorderByIndicator%5D=201&sp%5BorderingType%5D=Opadaju%C4%87e&sp%5BorderingByParameter%5D=Pokazatelju&sp%5BhasntClosedCase%5D=&sp%5BhasntActivCase%5D=&sp%5BisntCustomer%5D=&sp%5BcompanyPartialBlocked%5D=&sp%5BcompanyAlsuStatus%5D=&sp%5BcompanyAlsuStatusDateFrom%5D=&sp%5BcompanyAlsuStatusDateTo%5D=&sp%5BisOnBlackList%5D=&sp%5BisOnWhiteList%5D=&sp%5BoccupationText%5D=&sp%5BdrivingParkLicenceCountry%5D=&sp%5BdrivingParkLicenceType%5D=&sp%5BdrivingParkLicenceAnnualLicence%5D=&sp%5BdrivingParkLicenceIndividualLicence%5D=&sp%5BdrivingParkLicenceCemtLicence%5D=&sp%5BdrivingParkLicenceCountFrom%5D=&sp%5BdrivingParkLicenceCountTo%5D=&sp%5BbuildingPermitType%5D=&sp%5BbuildingPermitStatus%5D=&sp%5BbuildingPermitSupervisor%5D=&sp%5BbuildingPermitRequestTo%5D=&sp%5BbuildingPermitRequestFrom%5D=&sp%5BdrivingParkVehicleType%5D=&sp%5BdrivingParkSuperstructureType%5D=&sp%5BdrivingParkLoadCapasityFrom%5D=&sp%5BdrivingParkLoadCapasityTo%5D=&sp%5BhasWeb%5D=&sp%5BhasFacebook%5D=&sp%5BhasInstagram%5D=&sp%5BleaseSubjectBrand%5D=&sp%5BfirstBilanceYear%5D=&sp%5BhasConsolidateFinancialData%5D='

# Procesiranje argumenata
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --agents) NUM_AGENTS="$2"; shift ;;
        --delay) DELAY_BETWEEN_REQUESTS="$2"; shift ;;
        --take) TAKE_PER_REQUEST="$2"; shift ;;
        --help) 
            echo "Upotreba: $0 [OPCIJE]"
            echo ""
            echo "Opcije:"
            echo "  --agents N    Broj paralelnih agenata (default: 5)"
            echo "  --delay S     Kašnjenje između zahteva u sekundama (default: 1)"
            echo "  --take N      Broj redova po zahtevu (default: 50)"
            echo "  --help        Prikaži ovu pomoć"
            echo ""
            echo "Primer:"
            echo "  $0 --agents 10 --delay 2"
            exit 0
            ;;
        *) echo "Nepoznata opcija: $1"; exit 1 ;;
    esac
    shift
done

# Prikaži konfiguraciju
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Boniteti.me Parallel Scraper Configuration       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo -e "${GREEN}➤ Broj agenata:${NC} $NUM_AGENTS"
echo -e "${GREEN}➤ Redova po zahtevu:${NC} $TAKE_PER_REQUEST"
echo -e "${GREEN}➤ Kašnjenje između zahteva:${NC} ${DELAY_BETWEEN_REQUESTS}s"
echo -e "${GREEN}➤ Output direktorijum:${NC} $OUTPUT_DIR"
echo ""

# Kreiraj direktorijume
mkdir -p "$TEMP_DIR" "$LOGS_DIR" "$RESULTS_DIR"

# Funkcija za preuzimanje podataka
fetch_page() {
    local skip=$1
    local take=$2
    local page=$3
    local agent_id=$4
    local output_file="$TEMP_DIR/agent_${agent_id}_page_${page}.json"
    local log_file="$LOGS_DIR/agent_${agent_id}.log"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Agent $agent_id: Preuzimam stranicu $page (skip=$skip, take=$take)" >> "$log_file"
    
    local response=$(curl -s -w "\n%{http_code}" 'https://www.boniteti.me/searchcompany/getcompanyadvancedsearchjson' \
      -H 'accept: */*' \
      -H 'accept-language: en-US,en;q=0.9,sr-RS;q=0.8,sr;q=0.7' \
      -H 'content-type: application/x-www-form-urlencoded; charset=UTF-8' \
      -b "$COOKIES" \
      -H 'origin: https://www.boniteti.me' \
      -H 'referer: https://www.boniteti.me/advanced-search-company' \
      -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36' \
      -H 'x-requested-with: XMLHttpRequest' \
      --data-raw "${PARAMS}&requireTotalCount=true&skip=${skip}&take=${take}")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        echo "$body" > "$output_file"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Agent $agent_id: ✓ Stranica $page uspešno preuzeta" >> "$log_file"
        return 0
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Agent $agent_id: ✗ Greška pri preuzimanju stranice $page (HTTP $http_code)" >> "$log_file"
        return 1
    fi
}

# Funkcija za rad agenta
agent_worker() {
    local agent_id=$1
    local start_page=$2
    local end_page=$3
    local log_file="$LOGS_DIR/agent_${agent_id}.log"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Agent $agent_id započinje rad (stranice $start_page-$end_page)" > "$log_file"
    
    for ((page=$start_page; page<=$end_page; page++)); do
        local skip=$(( ($page - 1) * $TAKE_PER_REQUEST ))
        
        # Pokušaj preuzimanja sa retry logikom
        local retry_count=0
        local max_retries=3
        
        while [ $retry_count -lt $max_retries ]; do
            if fetch_page $skip $TAKE_PER_REQUEST $page $agent_id; then
                break
            else
                retry_count=$((retry_count + 1))
                if [ $retry_count -lt $max_retries ]; then
                    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Agent $agent_id: Pokušavam ponovo ($retry_count/$max_retries)..." >> "$log_file"
                    sleep $((DELAY_BETWEEN_REQUESTS * 2))
                fi
            fi
        done
        
        # Pauza između zahteva
        sleep $DELAY_BETWEEN_REQUESTS
    done
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Agent $agent_id završio rad" >> "$log_file"
}

# Korak 1: Preuzmi prvu stranicu da saznaš ukupan broj
echo -e "${YELLOW}📊 Preuzimam prvu stranicu za analizu...${NC}"
fetch_page 0 $TAKE_PER_REQUEST 1 0

if [ -f "$TEMP_DIR/agent_0_page_1.json" ]; then
    # Ekstraktuj ukupan broj
    TOTAL=$(cat "$TEMP_DIR/agent_0_page_1.json" | grep -o '"TotalCount":[0-9]*' | cut -d: -f2)
    if [ -z "$TOTAL" ]; then
        TOTAL=$(cat "$TEMP_DIR/agent_0_page_1.json" | grep -o '"totalCount":[0-9]*' | cut -d: -f2)
    fi
    
    if [ -z "$TOTAL" ]; then
        echo -e "${RED}❌ Ne mogu pronaći ukupan broj kompanija${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Ukupan broj kompanija: $TOTAL${NC}"
    
    # Izračunaj broj stranica
    TOTAL_PAGES=$((($TOTAL + $TAKE_PER_REQUEST - 1) / $TAKE_PER_REQUEST))
    echo -e "${GREEN}📖 Ukupno stranica: $TOTAL_PAGES${NC}"
    
    # Raspodeli posao između agenata
    PAGES_PER_AGENT=$((TOTAL_PAGES / NUM_AGENTS))
    REMAINING_PAGES=$((TOTAL_PAGES % NUM_AGENTS))
    
    echo ""
    echo -e "${BLUE}📋 Raspodela posla:${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Pokreni agente
    PIDS=()
    current_page=2  # Počinjemo od stranice 2 jer je 1 već preuzeta
    
    for ((i=1; i<=NUM_AGENTS; i++)); do
        local pages_for_this_agent=$PAGES_PER_AGENT
        
        # Dodaj preostale stranice prvim agentima
        if [ $i -le $REMAINING_PAGES ]; then
            pages_for_this_agent=$((pages_for_this_agent + 1))
        fi
        
        if [ $pages_for_this_agent -gt 0 ] && [ $current_page -le $TOTAL_PAGES ]; then
            local end_page=$((current_page + pages_for_this_agent - 1))
            
            # Proveri da ne prelazimo ukupan broj stranica
            if [ $end_page -gt $TOTAL_PAGES ]; then
                end_page=$TOTAL_PAGES
            fi
            
            echo -e "  ${GREEN}Agent $i:${NC} stranice $current_page - $end_page ($(($end_page - $current_page + 1)) stranica)"
            
            # Pokreni agenta u pozadini
            agent_worker $i $current_page $end_page &
            PIDS+=($!)
            
            current_page=$((end_page + 1))
        fi
    done
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Prikaži progres
    echo -e "${YELLOW}⏳ Čekam da agenti završe...${NC}"
    
    # Monitor progress
    while true; do
        active_agents=0
        for pid in "${PIDS[@]}"; do
            if kill -0 $pid 2>/dev/null; then
                active_agents=$((active_agents + 1))
            fi
        done
        
        if [ $active_agents -eq 0 ]; then
            break
        fi
        
        # Prikaži status
        completed_files=$(ls -1 "$TEMP_DIR"/agent_*_page_*.json 2>/dev/null | wc -l)
        echo -ne "\r${YELLOW}⏳ Aktivni agenti: $active_agents | Preuzeto stranica: $completed_files / $TOTAL_PAGES${NC}    "
        sleep 2
    done
    
    echo -e "\n${GREEN}✅ Svi agenti su završili!${NC}"
    
    # Korak 3: Spoji sve podatke
    echo ""
    echo -e "${YELLOW}🔄 Spajam sve podatke...${NC}"
    
    # Kreiraj finalni JSON sa svim podacima
    FINAL_JSON="$RESULTS_DIR/boniteti_all_data.json"
    echo '{"data":[' > "$FINAL_JSON"
    
    first=true
    for file in "$TEMP_DIR"/agent_*_page_*.json; do
        if [ -f "$file" ]; then
            # Ekstraktuj samo data array iz svakog fajla
            data=$(cat "$file" | jq -r '.data[]' 2>/dev/null)
            if [ ! -z "$data" ]; then
                if [ "$first" = true ]; then
                    first=false
                else
                    echo "," >> "$FINAL_JSON"
                fi
                cat "$file" | jq -c '.data[]' >> "$FINAL_JSON"
            fi
        fi
    done
    
    echo '],"totalCount":'$TOTAL'}' >> "$FINAL_JSON"
    
    # Kreiraj i CSV fajl
    echo -e "${YELLOW}📄 Kreiram CSV fajl...${NC}"
    CSV_FILE="$RESULTS_DIR/boniteti_all_data.csv"
    
    # Ekstraktuj podatke u CSV format
    node -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('$FINAL_JSON', 'utf8'));
    
    const csvHeader = 'ID,Naziv,PIB,Matični broj,Država,Grad,Adresa,Telefon,Email,Website,Bonitet,Delatnost,Broj zaposlenih,Prihod,Kapital,Neto profit\\n';
    fs.writeFileSync('$CSV_FILE', csvHeader);
    
    if (data.data && Array.isArray(data.data)) {
        data.data.forEach(company => {
            const row = [
                company.CompanyId || '',
                (company.Name || '').replace(/,/g, ';'),
                company.TaxNumber || '',
                company.RegistrationNumber || '',
                company.Country || '',
                company.Place || '',
                (company.Address || '').replace(/,/g, ';'),
                company.Phone || '',
                company.Email || '',
                company.Website || '',
                company.BonitetScore || '',
                (company.ActivityCode || '').replace(/,/g, ';'),
                company.NumberOfEmployees || '',
                company.Revenue || '',
                company.Capital || '',
                company.NetProfit || ''
            ].join(',');
            fs.appendFileSync('$CSV_FILE', row + '\\n');
        });
    }
    
    console.log('CSV kreiran sa ' + (data.data ? data.data.length : 0) + ' kompanija');
    " 2>/dev/null || echo -e "${YELLOW}⚠️  CSV kreiranje potrebuje Node.js${NC}"
    
    # Statistike
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    ZAVRŠNA STATISTIKA                  ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
    echo -e "${GREEN}✓ Ukupno kompanija:${NC} $TOTAL"
    echo -e "${GREEN}✓ Broj stranica:${NC} $TOTAL_PAGES"
    echo -e "${GREEN}✓ Broj agenata:${NC} $NUM_AGENTS"
    echo -e "${GREEN}✓ Preuzeto fajlova:${NC} $(ls -1 "$TEMP_DIR"/agent_*_page_*.json 2>/dev/null | wc -l)"
    echo -e "${GREEN}✓ Rezultati:${NC}"
    echo -e "   • JSON: $FINAL_JSON"
    echo -e "   • CSV: $CSV_FILE"
    echo -e "   • Logovi: $LOGS_DIR/"
    echo ""
    
else
    echo -e "${RED}❌ Greška pri preuzimanju početnih podataka${NC}"
    exit 1
fi