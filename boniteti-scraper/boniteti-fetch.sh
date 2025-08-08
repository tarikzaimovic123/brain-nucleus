#!/bin/bash

# Boniteti.me Data Fetcher
# Koristi validne session cookies

echo "🚀 Započinjem preuzimanje podataka sa boniteti.me..."

# Session cookies
COOKIES='_ga=GA1.2.1718927108.1754616016; _gid=GA1.2.1197884477.1754616016; Boniteti.me.Test=; ASP.NET_SessionId=tkebso4v3hnqgpgqz2lmma4a; Boniteti.me.UserCheck=6F88B9041376C77AAEE47841A835C38C; __zlcmid=1T2np6ChUR83tiZ; _ga_7CREWL27TX=GS2.2.s1754616016$o1$g1$t1754616966$j41$l0$h0'

# Parametri pretrage - svi sa početne stranice
PARAMS='sp%5BcompanyName%5D=&sp%5BfoundingDateFrom%5D=&sp%5BfoundingDateTo%5D=&sp%5BexportDateFrom%5D=&sp%5BexportDateTo%5D=&sp%5BimportDateFrom%5D=&sp%5BimportDateTo%5D=&sp%5BcompanyCountry%5D=Crna+Gora&sp%5BcompanyActivityCode%5D%5B%5D=A+-+POLjOPRIVREDA%2C+%C5%A0UMARSTVO+I+RIBARSTVO&sp%5BcompanyActivityCode%5D%5B%5D=B+-+RUDARSTVO&sp%5BcompanyActivityCode%5D%5B%5D=C+-+PRERA%C4%90IVA%C4%8CKA+INDUSTRIJA&sp%5BcompanyActivityCode%5D%5B%5D=D+-+SNABDEVANjE+ELEKTRI%C4%8CNOM+ENERGIJOM%2C+GASOM%2C+PAROM+I+KLIMATIZACIJA&sp%5BcompanyActivityCode%5D%5B%5D=E+-+SNABDEVANjE+VODOM%3B+UPRAVLjANjE+OTPADNIM+VODAMA%2C+KONTROLISANjE+PROCESA+UKLANjANjA+OTPADA+I+SLI%C4%8CNE+AKTIVNOSTI&sp%5BcompanyActivityCode%5D%5B%5D=F+-+GRA%C4%90EVINARSTVO&sp%5BcompanyActivityCode%5D%5B%5D=G+-+TRGOVINA+NA+VELIKO+I+TRGOVINA+NA+MALO%3B+POPRAVKA+MOTORNIH+VOZILA+I+MOTOCIKALA&sp%5BcompanyActivityCode%5D%5B%5D=H+-+SAOBRA%C4%86AJ+I+SKLADI%C5%A0TENjE&sp%5BcompanyActivityCode%5D%5B%5D=I+-+USLUGE+PRU%C5%BDANjA+SMjE%C5%A0TAJA+I+ISHRANE&sp%5BcompanyActivityCode%5D%5B%5D=J+-+INFORMISANjE+I+KOMUNIKACIJE&sp%5BcompanyActivityCode%5D%5B%5D=K+-+FINANSIJSKE+DjELATNOSTI+I+DjELATNOST+OSIGURANjA&sp%5BcompanyActivityCode%5D%5B%5D=L+-+POSLOVANjE+NEKRETNINAMA&sp%5BcompanyActivityCode%5D%5B%5D=M+-+STRU%C4%8CNE%2C+NAU%C4%8CNE+I+TEHNI%C4%8CKE+DjELATNOSTI&sp%5BcompanyActivityCode%5D%5B%5D=N+-+ADMINISTRATIVNE+I+POMO%C4%86NE+USLU%C5%BDNE+DjELATNOSTI&sp%5BcompanyActivityCode%5D%5B%5D=O+-+DR%C5%BDAVNA+UPRAVA+I+ODBRANA%3B+OBAVEZNO+SOCIJALNO+OSIGURANjE&sp%5BcompanyActivityCode%5D%5B%5D=P+-+OBRAZOVANjE&sp%5BcompanyActivityCode%5D%5B%5D=Q+-+ZDRAVSTVENA+I+SOCIJALNA+ZA%C5%A0TITA&sp%5BcompanyActivityCode%5D%5B%5D=R+-+UMjETNOST%2C+ZABAVA+I+REKREACIJA&sp%5BcompanyActivityCode%5D%5B%5D=S+-+OSTALE+USLU%C5%BDNE+DjELATNOSTI&sp%5BcompanySize%5D=&sp%5BcompanyLegalForm%5D=&sp%5BbudgetUser%5D=&sp%5BfounderName%5D=&sp%5BfounderCountry%5D=&sp%5BtrusteeName%5D=&sp%5BtrusteeCountry%5D=&sp%5BcompanyBonitetScore%5D=&sp%5BcompanyInsolvencyName%5D=&sp%5BinsolvencyDateFrom%5D=&sp%5BinsolvencyDateTo%5D=&sp%5BcompanyRegion%5D=&sp%5BcompanyPlace%5D=&sp%5BcompanyMunicipality%5D=&sp%5BcompanyPostalCode%5D=&sp%5BcompanyAddress%5D=&sp%5BcompanyLastFinReportYear%5D=2024&sp%5BcompanyFinReportCurrency%5D=EUR&sp%5BbranchName%5D=&sp%5BsalesIncomeFrom%5D=&sp%5BsalesIncomeTo%5D=&sp%5BcapitalFrom%5D=&sp%5BcapitalTo%5D=&sp%5BnetProfitFrom%5D=&sp%5BnetProfitTo%5D=&sp%5BnumberOfEmployeesFrom%5D=&sp%5BnumberOfEmployeesTo%5D=&sp%5BcompanyMultiSearch%5D=&sp%5BfinReportFormula%5D=&sp%5BorderByParameter%5D=revenue&sp%5BassetsFrom%5D=&sp%5BassetsTo%5D=&sp%5Bexporter%5D=&sp%5Bimporter%5D=&sp%5BexporterCountry%5D=&sp%5BimporterCountry%5D=&sp%5BimporterOriginCountry%5D=&sp%5BhasEmail%5D=&sp%5BhasPhone%5D=&sp%5BhasActiveCase%5D=&sp%5BhasClosedCase%5D=&sp%5BisCustomer%5D=&sp%5BregisteredOnNbs%5D=&sp%5BregisteredOnApr%5D=&sp%5BpaidCapitalTo%5D=&sp%5BpaidCapitalFrom%5D=&sp%5BnbsBillsBank%5D=&sp%5BnbsBillsBasicOfPublition%5D=&sp%5BaccountBank%5D=&sp%5BfirstIdicator%5D=&sp%5BsecondIdicator%5D=&sp%5BthirdIdicator%5D=&sp%5BthirdIdicatorTo%5D=&sp%5BthirdIdicatorFrom%5D=&sp%5BsecondIdicatorTo%5D=&sp%5BsecondIdicatorFrom%5D=&sp%5BfirstIdicatorTo%5D=&sp%5BfirstIdicatorFrom%5D=&sp%5BaccountDateOpenTo%5D=&sp%5BaccountDateOpenFrom%5D=&sp%5BaccountIsCovid%5D=&sp%5BblockDayInEver%5D=&sp%5BblockDayInOneYear%5D=&sp%5BblockDayInFourMonth%5D=&sp%5BblockDayInTwoMonth%5D=&sp%5BblockDayInOneMonth%5D=&sp%5BsubjectType%5D=&sp%5BtenderStatus%5D=&sp%5BcontractDateFrom%5D=&sp%5BcontractDateTo%5D=&sp%5BbillDateOfRegistrationFrom%5D=&sp%5BbillDateOfRegistrationTo%5D=&sp%5BleaseRegistrationDateFrom%5D=&sp%5BleaseRegistrationDateTo%5D=&sp%5BlastPaymentRateDateFrom%5D=&sp%5BlastPaymentRateDateTo%5D=&sp%5BleaseSubject%5D=&sp%5BdoesntHaveTrialsInMonths%5D=&sp%5BisBuyer%5D=&sp%5BisSupplier%5D=&sp%5BisLeaseBuyer%5D=&sp%5BisLeaseSupplier%5D=&sp%5BdoesntHaveTrials%5D=&sp%5BdoesntHaveExecutions%5D=&sp%5BriskScore%5D=&sp%5BorderByIndicator%5D=201&sp%5BorderingType%5D=Opadaju%C4%87e&sp%5BorderingByParameter%5D=Pokazatelju&sp%5BhasntClosedCase%5D=&sp%5BhasntActivCase%5D=&sp%5BisntCustomer%5D=&sp%5BcompanyPartialBlocked%5D=&sp%5BcompanyAlsuStatus%5D=&sp%5BcompanyAlsuStatusDateFrom%5D=&sp%5BcompanyAlsuStatusDateTo%5D=&sp%5BisOnBlackList%5D=&sp%5BisOnWhiteList%5D=&sp%5BoccupationText%5D=&sp%5BdrivingParkLicenceCountry%5D=&sp%5BdrivingParkLicenceType%5D=&sp%5BdrivingParkLicenceAnnualLicence%5D=&sp%5BdrivingParkLicenceIndividualLicence%5D=&sp%5BdrivingParkLicenceCemtLicence%5D=&sp%5BdrivingParkLicenceCountFrom%5D=&sp%5BdrivingParkLicenceCountTo%5D=&sp%5BbuildingPermitType%5D=&sp%5BbuildingPermitStatus%5D=&sp%5BbuildingPermitSupervisor%5D=&sp%5BbuildingPermitRequestTo%5D=&sp%5BbuildingPermitRequestFrom%5D=&sp%5BdrivingParkVehicleType%5D=&sp%5BdrivingParkSuperstructureType%5D=&sp%5BdrivingParkLoadCapasityFrom%5D=&sp%5BdrivingParkLoadCapasityTo%5D=&sp%5BhasWeb%5D=&sp%5BhasFacebook%5D=&sp%5BhasInstagram%5D=&sp%5BleaseSubjectBrand%5D=&sp%5BfirstBilanceYear%5D=&sp%5BhasConsolidateFinancialData%5D='

# Timestamp za fajlove
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Funkcija za preuzimanje podataka
fetch_page() {
    local skip=$1
    local take=$2
    local page=$3
    
    echo "📄 Preuzimam stranicu $page (skip=$skip, take=$take)..."
    
    curl -s 'https://www.boniteti.me/searchcompany/getcompanyadvancedsearchjson' \
      -H 'accept: */*' \
      -H 'accept-language: en-US,en;q=0.9,sr-RS;q=0.8,sr;q=0.7' \
      -H 'content-type: application/x-www-form-urlencoded; charset=UTF-8' \
      -b "$COOKIES" \
      -H 'origin: https://www.boniteti.me' \
      -H 'referer: https://www.boniteti.me/advanced-search-company' \
      -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36' \
      -H 'x-requested-with: XMLHttpRequest' \
      --data-raw "${PARAMS}&requireTotalCount=true&skip=${skip}&take=${take}" \
      -o "boniteti_page_${page}.json"
}

# Preuzmi prvu stranicu sa ukupnim brojem
echo "📊 Preuzimam prvu stranicu sa ukupnim brojem kompanija..."
fetch_page 0 50 1

# Proveri da li je uspešno
if [ -f "boniteti_page_1.json" ]; then
    # Ekstraktuj ukupan broj iz JSON-a
    TOTAL=$(cat boniteti_page_1.json | grep -o '"TotalCount":[0-9]*' | cut -d: -f2)
    
    if [ -z "$TOTAL" ]; then
        TOTAL=$(cat boniteti_page_1.json | grep -o '"totalCount":[0-9]*' | cut -d: -f2)
    fi
    
    echo "✅ Ukupan broj kompanija: $TOTAL"
    
    # Preuzmi ostale stranice
    TAKE=50
    PAGES=$((($TOTAL + $TAKE - 1) / $TAKE))
    
    echo "📖 Ukupno stranica: $PAGES"
    
    # Ograniči na prvih 10 stranica za početak
    MAX_PAGES=10
    if [ $PAGES -gt $MAX_PAGES ]; then
        PAGES=$MAX_PAGES
        echo "⚠️  Ograničavam na prvih $MAX_PAGES stranica"
    fi
    
    # Preuzmi ostale stranice
    for ((i=2; i<=PAGES; i++)); do
        SKIP=$(( ($i - 1) * $TAKE ))
        fetch_page $SKIP $TAKE $i
        sleep 1  # Pauza između zahteva
    done
    
    # Spoji sve JSON fajlove
    echo "🔄 Spajam sve podatke..."
    cat boniteti_page_*.json > "boniteti_all_data_${TIMESTAMP}.json"
    
    echo "✅ Završeno! Podatke pronađi u: boniteti_all_data_${TIMESTAMP}.json"
    
    # Obriši pojedinačne stranice
    rm boniteti_page_*.json
else
    echo "❌ Greška pri preuzimanju podataka"
fi